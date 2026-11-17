<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Application\Payment\OrderPayments;
use App\Domain\Payment\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The order (with `paid_cents` / `balance_cents`) and all its payments, voided ones included.
 *
 * @property OrderPayments $resource
 */
final class OrderPaymentsResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'order' => (new OrderResource($this->resource->order))->toArray($request),
            'payments' => array_map(fn (Payment $p) => (new PaymentResource($p))->toArray($request), $this->resource->payments),
        ];
    }
}
