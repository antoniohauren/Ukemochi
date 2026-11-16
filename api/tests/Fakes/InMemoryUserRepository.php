<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Auth\UserRepository;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;

final class InMemoryUserRepository implements UserRepository
{
    /** @var array<int, User> */
    public array $users = [];

    public function add(User $user): User
    {
        return $this->users[$user->id] = $user;
    }

    public function find(int $id): ?User
    {
        return $this->users[$id] ?? null;
    }

    public function findByName(string $name): ?User
    {
        foreach ($this->users as $user) {
            if (mb_strtolower($user->name) === mb_strtolower($name)) {
                return $user;
            }
        }

        return null;
    }

    public function all(): array
    {
        $users = array_values($this->users);
        usort($users, fn (User $a, User $b) => strcasecmp($a->name, $b->name));

        return $users;
    }

    public function create(string $name, string $pinHash, Role $role, bool $active = true): User
    {
        return $this->add(new User(count($this->users) + 1, $name, $role, $active, $pinHash));
    }

    public function update(int $id, string $name, Role $role, bool $active): ?User
    {
        $user = $this->find($id);

        return $user === null ? null : $this->add(new User($id, $name, $role, $active, $user->pinHash));
    }

    public function setPinHash(int $id, string $pinHash): bool
    {
        $user = $this->find($id);
        if ($user !== null) {
            $this->add(new User($id, $user->name, $user->role, $user->active, $pinHash));
        }

        return $user !== null;
    }

    public function lockActiveAdminIds(): array
    {
        $ids = [];
        foreach ($this->users as $user) {
            if ($user->role === Role::Admin && $user->active) {
                $ids[] = $user->id;
            }
        }

        return $ids;
    }
}
