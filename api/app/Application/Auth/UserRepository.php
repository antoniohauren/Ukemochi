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

    /** @return list<User> ordered by name */
    public function all(): array;

    /** Throws NameTaken when the name is already in use. */
    public function create(string $name, string $pinHash, Role $role, bool $active = true): User;

    /** Changes name, role and active; null when there is no such user. Throws NameTaken. */
    public function update(int $id, string $name, Role $role, bool $active): ?User;

    /** False when there is no such user. */
    public function setPinHash(int $id, string $pinHash): bool;

    /**
     * Ids of the active admins, locked until the surrounding transaction ends,
     * so two parallel demotions cannot both see "another admin is left".
     *
     * @return list<int>
     */
    public function lockActiveAdminIds(): array;
}
