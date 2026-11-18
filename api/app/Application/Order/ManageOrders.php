<?php

declare(strict_types=1);

namespace App\Application\Order;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Clock;
use App\Application\Menu\MenuRepository;
use App\Application\Transaction;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Menu\Item;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Order\AddonNotAllowed;
use App\Domain\Order\LineAddon;
use App\Domain\Order\LineNotFound;
use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderNotFound;
use App\Domain\Order\OrderStatus;
use App\Domain\Ticket\TicketKind;

/**
 * Order mutations. Each one locks the order, writes it and its audit row in one transaction,
 * then tells live screens once it has committed.
 */
final readonly class ManageOrders
{
    public function __construct(
        private OrderRepository $orders,
        private MenuRepository $menu,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
        private Clock $clock,
        private OrderEvents $events,
    ) {}

    /** @param  list<LineInput>  $lines  without `lineId` */
    public function create(OrderDetails $details, array $lines): Order
    {
        $userId = $this->session->userId() ?? throw new NotAuthenticated;

        return $this->announced($this->transaction->run(function () use ($details, $lines, $userId): Order {
            $snapshot = $this->lines($lines, []);
            // Number taken last and inside the transaction: a failure above or a rollback leaves no gap.
            $order = $this->orders->save(Order::place($this->orders->nextNumber(), $details, $snapshot, $userId, $this->clock->now()));
            $this->record($userId, $order, 'create', $this->summary($order), null);

            return $order;
        }));
    }

    /**
     * Replaces details and lines. Lines sent with `lineId` keep their name/price snapshot while
     * the variant stays the same; lines left out are removed. Editing a closed order reopens it.
     *
     * @param  list<LineInput>  $lines
     */
    public function edit(int $id, OrderDetails $details, array $lines, ?string $note): Order
    {
        return $this->mutate($id, 'update', function (Order $order) use ($details, $lines): array {
            $order->edit($details, $this->lines($lines, $order->lines));

            return $this->summary($order);
        }, $note);
    }

    /** ready, out_for_delivery or closed; see OrderStatus for the allowed moves. */
    public function changeStatus(int $id, OrderStatus $to, ?string $note): Order
    {
        return $this->mutate($id, 'status', function (Order $order) use ($to): array {
            $from = $order->status;
            $order->moveTo($to, $this->clock->now());

            return ['from' => $from->value, 'to' => $to->value];
        }, $note);
    }

    public function cancel(int $id, string $reason, ?string $note): Order
    {
        return $this->mutate($id, 'cancel', function (Order $order) use ($reason): array {
            $order->cancel($reason);

            return ['reason' => $order->cancelReason, 'version' => $order->version];
        }, $note);
    }

    public function reopen(int $id, ?string $note): Order
    {
        return $this->mutate($id, 'reopen', function (Order $order): array {
            $order->reopen();

            return ['version' => $order->version];
        }, $note);
    }

    /** Records that a ticket showing `version` went to the printer; see Order::markPrinted(). */
    public function markPrinted(int $id, TicketKind $kind, int $version, ?string $note): Order
    {
        return $this->mutate($id, 'print', function (Order $order) use ($kind, $version): array {
            $order->markPrinted($kind, $version);

            return ['kind' => $kind->value, 'version' => $version];
        }, $note);
    }

    /** @param  \Closure(Order): array<string, mixed>  $change  applies the change, returns the audit summary */
    private function mutate(int $id, string $action, \Closure $change, ?string $note): Order
    {
        $userId = $this->session->userId() ?? throw new NotAuthenticated;

        return $this->announced($this->transaction->run(function () use ($id, $action, $change, $note, $userId): Order {
            $order = $this->orders->lock($id) ?? throw new OrderNotFound($id);
            $summary = $change($order);
            $order = $this->orders->save($order);
            $this->record($userId, $order, $action, $summary, $note);

            return $order;
        }));
    }

    private function announced(Order $order): Order
    {
        $this->events->updated($order->id, $order->version);

        return $order;
    }

    /**
     * @param  list<LineInput>  $inputs
     * @param  list<OrderLine>  $current
     * @return list<OrderLine>
     */
    private function lines(array $inputs, array $current): array
    {
        $byId = [];
        foreach ($current as $line) {
            $byId[$line->id] = $line;
        }

        $lines = [];
        foreach ($inputs as $input) {
            $old = null;
            if ($input->lineId !== null) {
                $old = $byId[$input->lineId] ?? throw new LineNotFound($input->lineId);
                // A line can be sent once.
                unset($byId[$input->lineId]);
            }
            $lines[] = $this->line($input, $old);
        }

        return $lines;
    }

    private function line(LineInput $input, ?OrderLine $old): OrderLine
    {
        $addonIds = array_values(array_unique($input->addonIds));

        if ($old !== null && $old->variantId === $input->variantId) {
            $kept = [];
            foreach ($old->addons as $addon) {
                $kept[$addon->addonId] = $addon;
            }
            $addons = array_map(fn (int $addonId) => $kept[$addonId] ?? $this->addon($addonId, $this->item($old->variantId)), $addonIds);

            return new OrderLine($old->id, $old->variantId, $old->itemName, $old->variantName, $old->unitPriceCents, $input->qty, $input->note, $addons, $old->categoryName, $old->printName);
        }

        $variant = $this->menu->findVariant($input->variantId) ?? throw new MenuNotFound('variant', $input->variantId);
        $item = $this->item($variant->id);

        return new OrderLine(
            $old->id ?? 0, $variant->id, $item->name, $variant->name, $variant->priceCents, $input->qty, $input->note,
            array_map(fn (int $addonId) => $this->addon($addonId, $item), $addonIds),
            ($this->menu->findCategory($item->categoryId) ?? throw new MenuNotFound('category', $item->categoryId))->name,
            $variant->printName,
        );
    }

    private function item(int $variantId): Item
    {
        $variant = $this->menu->findVariant($variantId) ?? throw new MenuNotFound('variant', $variantId);

        return $this->menu->findItem($variant->itemId) ?? throw new MenuNotFound('item', $variant->itemId);
    }

    /** Snapshot of an active add-on offered on the item or its category. */
    private function addon(int $id, Item $item): LineAddon
    {
        $addon = $this->menu->findAddon($id) ?? throw new MenuNotFound('addon', $id);
        if (! $addon->active || ($addon->itemId !== $item->id && $addon->categoryId !== $item->categoryId)) {
            throw new AddonNotAllowed($id);
        }

        return new LineAddon($addon->id, $addon->name, $addon->priceCents);
    }

    /** @return array<string, mixed> */
    private function summary(Order $order): array
    {
        $d = $order->details;

        return [
            'type' => $d->type->value, 'status' => $order->status->value, 'customer_id' => $d->customerId, 'customer_name' => $d->customerName,
            'address_text' => $d->addressText, 'delivery_fee_cents' => $d->deliveryFeeCents, 'note' => $d->note,
            'version' => $order->version, 'total_cents' => $order->totalCents(),
            'lines' => array_map(fn (OrderLine $line) => [
                'category_name' => $line->categoryName, 'item_name' => $line->itemName, 'variant_name' => $line->variantName, 'qty' => $line->qty,
                'unit_price_cents' => $line->unitPriceCents, 'note' => $line->note,
                'addons' => array_map(fn (LineAddon $addon) => $addon->name, $line->addons),
            ], $order->lines),
        ];
    }

    /** @param  array<string, mixed>  $summary */
    private function record(int $userId, Order $order, string $action, array $summary, ?string $note): void
    {
        $this->audit->record($userId, 'order', $order->id, $action, $summary, $note);
    }
}
