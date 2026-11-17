<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\OrderLine;
use App\Domain\Ticket\Bill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Bill $resource */
final class BillResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $b = $this->resource;

        return [
            'kind' => 'bill', 'number' => $b->number, 'type' => $b->type->value, 'customer_name' => $b->customerName,
            'address_text' => $b->addressText, 'created_at' => $b->createdAt->format(DATE_ATOM), 'version' => $b->version,
            'cancelled' => $b->cancelled, 'note' => $b->note,
            'lines' => array_map(fn (OrderLine $l) => (new OrderLineResource($l))->toArray($request), $b->lines),
            ...TotalsJson::of($b->totals),
        ];
    }
}
