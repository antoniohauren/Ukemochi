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

    public function create(string $name, string $pinHash, Role $role): User
    {
        return $this->add(new User(count($this->users) + 1, $name, $role, true, $pinHash));
    }
}
