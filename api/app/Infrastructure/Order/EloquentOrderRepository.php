<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Application\Order\OrderRepository;
use App\Domain\Order\Order;
use App\Domain\Order\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class EloquentOrderRepository implements OrderRepository
{
    public function nextNumber(): int
    {
        // The UPDATE row-locks the counter until the transaction ends, like SELECT ... FOR UPDATE.
        /** @var object{value: int} $row */
        $row = DB::selectOne('UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value', ['order_number']);

        return $row->value;
    }

    public function find(int $id): ?Order
    {
        return $this->query()->find($id)?->toDomain();
    }

    public function list(array $statuses, ?int $limit): array
    {
        return array_values($this->query()
            ->whereIn('status', array_map(fn (OrderStatus $s) => $s->value, $statuses))
            ->orderByDesc('id')->when($limit !== null, fn ($q) => $q->limit((int) $limit))->get()
            ->map(fn (EloquentOrder $o) => $o->toDomain())->all());
    }

    public function listForCustomer(int $customerId, int $limit): array
    {
        return array_values($this->query()->where('customer_id', $customerId)->orderByDesc('id')->limit($limit)->get()
            ->map(fn (EloquentOrder $o) => $o->toDomain())->all());
    }

    public function lock(int $id): ?Order
    {
        return $this->query()->lockForUpdate()->find($id)?->toDomain();
    }

    public function save(Order $order): Order
    {
        $d = $order->details;
        $model = EloquentOrder::query()->find($order->id) ?? new EloquentOrder;
        $model->forceFill([
            'id' => $order->id, 'type' => $d->type->value, 'status' => $order->status->value,
            'customer_id' => $d->customerId, 'customer_name' => $d->customerName, 'address_text' => $d->addressText,
            'delivery_fee_cents' => $d->deliveryFeeCents, 'pay_on_delivery' => $d->payOnDelivery,
            'change_for_cents' => $d->changeForCents, 'pay_method' => $d->payMethod?->value, 'note' => $d->note, 'created_by' => $order->createdBy,
            'created_at' => $order->createdAt, 'closed_at' => $order->closedAt, 'cancel_reason' => $order->cancelReason,
            'printed_version' => $order->printedVersion, 'version' => $order->version,
        ])->save();

        $kept = array_values(array_filter(array_map(fn ($line) => $line->id, $order->lines)));
        EloquentOrderLine::query()->where('order_id', $order->id)->whereNotIn('id', $kept)->delete();

        foreach ($order->lines as $line) {
            $lineModel = $line->id === 0 ? new EloquentOrderLine : EloquentOrderLine::query()->where('order_id', $order->id)->findOrFail($line->id);
            $lineModel->forceFill([
                'order_id' => $order->id, 'variant_id' => $line->variantId, 'category_name' => $line->categoryName, 'item_name' => $line->itemName,
                'variant_name' => $line->variantName, 'unit_price_cents' => $line->unitPriceCents, 'qty' => $line->qty, 'note' => $line->note,
                'print_name' => $line->printName,
            ])->save();

            // Add-on snapshots are owned by the line and nothing points at them: rewrite them.
            EloquentLineAddon::query()->where('line_id', $lineModel->id)->delete();
            foreach ($line->addons as $addon) {
                (new EloquentLineAddon)->forceFill([
                    'line_id' => $lineModel->id, 'addon_id' => $addon->addonId, 'name' => $addon->name, 'price_cents' => $addon->priceCents,
                ])->save();
            }
        }

        return $this->find($order->id) ?? throw new \LogicException("Order {$order->id} vanished after save.");
    }

    /** @return Builder<EloquentOrder> with lines and `paid_cents` (Σ non-voided payments) */
    private function query(): Builder
    {
        return EloquentOrder::query()->with('lines.addons')->select('orders.*')->selectSub(
            DB::table('payments')->selectRaw('COALESCE(SUM(amount_cents), 0)')->whereColumn('order_id', 'orders.id')->where('voided', false),
            'paid_cents',
        );
    }
}
