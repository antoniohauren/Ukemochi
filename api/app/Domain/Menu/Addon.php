<?php

declare(strict_types=1);

namespace App\Domain\Menu;

/** Priced extra offered on one item or on every item of one category. `id` is 0 until stored. */
final readonly class Addon
{
    public function __construct(
        public int $id,
        public ?int $itemId,
        public ?int $categoryId,
        public string $name,
        public int $priceCents,
        public bool $active,
    ) {
        if ($priceCents < 0) {
            throw new InvalidPrice;
        }
        if (($itemId === null) === ($categoryId === null)) {
            throw new InvalidAddonTarget;
        }
    }
}
