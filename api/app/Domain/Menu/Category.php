<?php

declare(strict_types=1);

namespace App\Domain\Menu;

/** `id` is 0 until the repository stores it. */
final readonly class Category
{
    public function __construct(
        public int $id,
        public string $name,
        public int $sort,
        public bool $active,
    ) {}
}
