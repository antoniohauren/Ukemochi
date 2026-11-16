<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Menu;
use App\Domain\Menu\Variant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Menu tree: categories, each with its add-ons and items; items with variants and add-ons.
 *
 * @property Menu $resource
 */
final class MenuResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{categories: list<array<string, mixed>>} */
    public function toArray(Request $request): array
    {
        $menu = $this->resource;

        return ['categories' => array_map(fn (Category $c) => [
            ...(new CategoryResource($c))->toArray($request),
            'addons' => $this->addons($menu, $request, fn (Addon $a) => $a->categoryId === $c->id),
            'items' => array_values(array_map(fn (Item $i) => [
                ...(new ItemResource($i))->toArray($request),
                'variants' => array_values(array_map(
                    fn (Variant $v) => (new VariantResource($v))->toArray($request),
                    array_filter($menu->variants, fn (Variant $v) => $v->itemId === $i->id),
                )),
                'addons' => $this->addons($menu, $request, fn (Addon $a) => $a->itemId === $i->id),
            ], array_filter($menu->items, fn (Item $i) => $i->categoryId === $c->id))),
        ], $menu->categories)];
    }

    /**
     * @param  \Closure(Addon): bool  $belongs
     * @return list<array<string, mixed>>
     */
    private function addons(Menu $menu, Request $request, \Closure $belongs): array
    {
        return array_values(array_map(fn (Addon $a) => (new AddonResource($a))->toArray($request), array_filter($menu->addons, $belongs)));
    }
}
