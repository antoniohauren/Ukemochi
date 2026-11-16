<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Application\Auth\UserRepository;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use Illuminate\Database\UniqueConstraintViolationException;

final class EloquentUserRepository implements UserRepository
{
    public function find(int $id): ?User
    {
        return EloquentUser::query()->find($id)?->toDomain();
    }

    public function findByName(string $name): ?User
    {
        return EloquentUser::query()->whereRaw('lower(name) = lower(?)', [$name])->first()?->toDomain();
    }

    public function create(string $name, string $pinHash, Role $role): User
    {
        $user = (new EloquentUser)->forceFill(['name' => $name, 'pin_hash' => $pinHash, 'role' => $role, 'active' => true]);

        try {
            $user->save();
        } catch (UniqueConstraintViolationException) {
            // A parallel create took the name after the caller's findByName check.
            throw new NameTaken;
        }

        return $user->toDomain();
    }
}
