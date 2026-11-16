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

    public function all(): array
    {
        $models = EloquentUser::query()->orderByRaw('lower(name)')->orderBy('id')->get()->all();

        return array_values(array_map(fn (EloquentUser $u) => $u->toDomain(), $models));
    }

    public function create(string $name, string $pinHash, Role $role, bool $active = true): User
    {
        $user = (new EloquentUser)->forceFill(['name' => $name, 'pin_hash' => $pinHash, 'role' => $role, 'active' => $active]);
        $this->save($user);

        return $user->toDomain();
    }

    public function update(int $id, string $name, Role $role, bool $active): ?User
    {
        $user = EloquentUser::query()->find($id);
        if ($user === null) {
            return null;
        }
        $this->save($user->forceFill(['name' => $name, 'role' => $role, 'active' => $active]));

        return $user->toDomain();
    }

    public function setPinHash(int $id, string $pinHash): bool
    {
        return EloquentUser::query()->whereKey($id)->update(['pin_hash' => $pinHash]) === 1;
    }

    public function lockActiveAdminIds(): array
    {
        // FOR UPDATE is not allowed with count(), so lock and fetch the ids.
        /** @var list<int> */
        return EloquentUser::query()->where('role', Role::Admin)->where('active', true)
            ->lockForUpdate()->pluck('id')->all();
    }

    private function save(EloquentUser $user): void
    {
        try {
            $user->save();
        } catch (UniqueConstraintViolationException) {
            // A parallel write took the name after the caller's findByName check.
            throw new NameTaken;
        }
    }
}
