<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Application\Order\OrderRepository;
use App\Domain\Order\Order;
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
        return EloquentOrder::query()->with('lines.addons')->find($id)?->toDomain();
    }

    public function lock(int $id): ?Order
    {
        return EloquentOrder::query()->with('lines.addons')->lockForUpdate()->find($id)?->toDomain();
    }

    /** `printed_version` is not written here: only printing changes it. */
    public function save(Order $order): Order
    {
        $d = $order->details;
        $model = EloquentOrder::query()->find($order->id) ?? new EloquentOrder;
        $model->forceFill([
            'id' => $order->id, 'type' => $d->type->value, 'status' => $order->status->value,
            'customer_id' => $d->customerId, 'customer_name' => $d->customerName, 'address_text' => $d->addressText,
            'delivery_fee_cents' => $d->deliveryFeeCents, 'pay_on_delivery' => $d->payOnDelivery,
            'change_for_cents' => $d->changeForCents, 'note' => $d->note, 'created_by' => $order->createdBy,
            'created_at' => $order->createdAt, 'closed_at' => $order->closedAt, 'cancel_reason' => $order->cancelReason,
            'version' => $order->version,
        ])->save();

        $kept = array_values(array_filter(array_map(fn ($line) => $line->id, $order->lines)));
        EloquentOrderLine::query()->where('order_id', $order->id)->whereNotIn('id', $kept)->delete();

        foreach ($order->lines as $line) {
            $lineModel = $line->id === 0 ? new EloquentOrderLine : EloquentOrderLine::query()->where('order_id', $order->id)->findOrFail($line->id);
            $lineModel->forceFill([
                'order_id' => $order->id, 'variant_id' => $line->variantId, 'item_name' => $line->itemName,
                'variant_name' => $line->variantName, 'unit_price_cents' => $line->unitPriceCents, 'qty' => $line->qty, 'note' => $line->note,
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
}
