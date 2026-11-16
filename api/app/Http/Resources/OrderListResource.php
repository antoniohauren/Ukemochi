<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property list<Order> $resource */
final class OrderListResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{orders: list<array<string, mixed>>} */
    public function toArray(Request $request): array
    {
        return ['orders' => array_map(fn (Order $o) => (new OrderResource($o))->toArray($request), $this->resource)];
    }
}
