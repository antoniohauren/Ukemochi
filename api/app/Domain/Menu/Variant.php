<?php

declare(strict_types=1);

namespace App\Domain\Menu;

/**
 * Sellable size/kind of an item with its own price. `name` is '' for an item's default variant; `id` is 0 until stored.
 * `printName` replaces "category item · variant" on tickets when set.
 */
final readonly class Variant
{
    public function __construct(
        public int $id,
        public int $itemId,
        public string $name,
        public int $priceCents,
        public bool $available,
        public int $sort,
        public ?string $printName = null,
    ) {
        if ($priceCents < 0) {
            throw new InvalidPrice;
        }
    }
}
