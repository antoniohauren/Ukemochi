<?php

declare(strict_types=1);

namespace App\Domain\Auth;

final readonly class User
{
    public function __construct(
        public int $id,
        public string $name,
        public Role $role,
        public bool $active,
        public string $pinHash,
    ) {}
}
