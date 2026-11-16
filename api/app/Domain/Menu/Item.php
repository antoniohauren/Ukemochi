<?php

declare(strict_types=1);

namespace App\Domain\Menu;

/** `id` is 0 until the repository stores it. */
final readonly class Item
{
    public function __construct(
        public int $id,
        public int $categoryId,
        public string $name,
        public ?string $note,
        public bool $active,
        public int $sort,
    ) {}
}
