<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Menu\Variant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Variant $resource */
final class VariantResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, item_id: int, name: string, price_cents: int, available: bool, sort: int} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['id' => $r->id, 'item_id' => $r->itemId, 'name' => $r->name, 'price_cents' => $r->priceCents, 'available' => $r->available, 'sort' => $r->sort];
    }
}
