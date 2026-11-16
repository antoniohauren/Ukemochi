<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Auth\Role;
use App\Domain\Auth\User;

interface UserRepository
{
    public function find(int $id): ?User;

    /** Case-insensitive: names are unique ignoring case. */
    public function findByName(string $name): ?User;

    public function create(string $name, string $pinHash, Role $role): User;
}
