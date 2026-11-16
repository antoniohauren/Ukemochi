<?php

declare(strict_types=1);

namespace App\Domain\Menu;

/** Whole menu, flat and ordered (categories by sort, variants by sort); deleted variants left out. */
final readonly class Menu
{
    /**
     * @param  list<Category>  $categories
     * @param  list<Item>  $items
     * @param  list<Variant>  $variants
     * @param  list<Addon>  $addons
     */
    public function __construct(
        public array $categories,
        public array $items,
        public array $variants,
        public array $addons,
    ) {}
}
