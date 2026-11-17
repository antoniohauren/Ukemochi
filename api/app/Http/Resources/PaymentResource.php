<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Payment\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `change_cents` = tendered − amount, cash only.
 *
 * @property Payment $resource
 */
final class PaymentResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $p = $this->resource;

        return [
            'id' => $p->id, 'order_id' => $p->orderId, 'shift_id' => $p->shiftId, 'method' => $p->method->value,
            'amount_cents' => $p->amountCents, 'tendered_cents' => $p->tenderedCents, 'change_cents' => $p->changeCents(),
            'payer_label' => $p->payerLabel, 'note' => $p->note, 'created_by' => $p->createdBy,
            'created_at' => $p->createdAt->format(DATE_ATOM), 'voided' => $p->voided,
        ];
    }
}
