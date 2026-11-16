<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Menu\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Category $resource */
final class CategoryResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, name: string, sort: int, active: bool} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['id' => $r->id, 'name' => $r->name, 'sort' => $r->sort, 'active' => $r->active];
    }
}
