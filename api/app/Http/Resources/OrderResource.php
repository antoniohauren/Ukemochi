<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Totals come from the domain; frontends show them as they are.
 *
 * @property Order $resource
 */
final class OrderResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $o = $this->resource;
        $d = $o->details;

        return [
            'id' => $o->id, 'type' => $d->type->value, 'status' => $o->status->value,
            'customer_id' => $d->customerId, 'customer_name' => $d->customerName, 'address_text' => $d->addressText,
            'delivery_fee_cents' => $d->deliveryFeeCents, 'pay_on_delivery' => $d->payOnDelivery,
            'change_for_cents' => $d->changeForCents, 'pay_method' => $d->payMethod?->value, 'note' => $d->note,
            'lines' => array_map(fn (OrderLine $l) => (new OrderLineResource($l))->toArray($request), $o->lines),
            'subtotal_cents' => $o->subtotalCents(), 'total_cents' => $o->totalCents(),
            'created_by' => $o->createdBy, 'created_at' => $o->createdAt->format(DATE_ATOM),
            'closed_at' => $o->closedAt?->format(DATE_ATOM), 'cancel_reason' => $o->cancelReason,
            'printed_version' => $o->printedVersion, 'version' => $o->version,
        ];
    }
}
