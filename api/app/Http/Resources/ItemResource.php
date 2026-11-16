<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Menu\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Item $resource */
final class ItemResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, category_id: int, name: string, note: ?string, active: bool} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['id' => $r->id, 'category_id' => $r->categoryId, 'name' => $r->name, 'note' => $r->note, 'active' => $r->active];
    }
}
