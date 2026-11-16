<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Menu\Addon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Addon $resource */
final class AddonResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, item_id: ?int, category_id: ?int, name: string, price_cents: int, active: bool} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['id' => $r->id, 'item_id' => $r->itemId, 'category_id' => $r->categoryId, 'name' => $r->name, 'price_cents' => $r->priceCents, 'active' => $r->active];
    }
}
