<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Stock\StockLevel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property StockLevel $resource */
final class StockLevelResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{variant_id: int, item_name: string, variant_name: string, track_stock: bool, stock_min: int|null, qty: int, sold_today: int, status: string} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return [
            'variant_id' => $r->variantId, 'item_name' => $r->itemName, 'variant_name' => $r->variantName,
            'track_stock' => $r->tracked, 'stock_min' => $r->min, 'qty' => $r->qty, 'sold_today' => $r->soldToday,
            'status' => $r->status()->value,
        ];
    }
}
