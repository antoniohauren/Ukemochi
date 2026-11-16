<?php

declare(strict_types=1);

namespace App\Application\Staff;

use App\Application\Audit\AuditLog;
use App\Application\Auth\PinHasher;
use App\Application\Auth\SessionAuth;
use App\Application\Auth\UserRepository;
use App\Application\Transaction;
use App\Domain\Auth\LastAdmin;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Pin;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use App\Domain\Auth\UserNotFound;

/** Staff accounts. Each write stores the user and its audit row in one transaction; PINs never reach the audit log. */
final readonly class ManageStaff
{
    public function __construct(
        private UserRepository $users,
        private PinHasher $hasher,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
    ) {}

    /** @return list<User> */
    public function list(): array
    {
        return $this->users->all();
    }

    public function create(string $name, Role $role, string $pin, bool $active): User
    {
        Pin::assertValid($pin);
        $this->assertNameFree($name, null);
        $hash = $this->hasher->hash($pin);

        return $this->transaction->run(fn () => $this->audited(
            $this->users->create($name, $hash, $role, $active), 'create',
        ));
    }

    public function update(int $id, string $name, Role $role, bool $active): User
    {
        $this->assertNameFree($name, $id);

        return $this->transaction->run(function () use ($id, $name, $role, $active): User {
            $current = $this->users->find($id) ?? throw new UserNotFound($id);
            $losesAdmin = $current->role === Role::Admin && $current->active && ($role !== Role::Admin || ! $active);
            if ($losesAdmin && count($this->users->lockActiveAdminIds()) <= 1) {
                throw new LastAdmin;
            }

            return $this->audited($this->users->update($id, $name, $role, $active) ?? throw new UserNotFound($id), 'update');
        });
    }

    public function resetPin(int $id, string $pin): void
    {
        Pin::assertValid($pin);
        $hash = $this->hasher->hash($pin);

        $this->transaction->run(function () use ($id, $hash): void {
            if (! $this->users->setPinHash($id, $hash)) {
                throw new UserNotFound($id);
            }
            $this->audit->record($this->session->userId(), 'user', $id, 'reset_pin', []);
        });
    }

    private function assertNameFree(string $name, ?int $ownId): void
    {
        $other = $this->users->findByName($name);
        if ($other !== null && $other->id !== $ownId) {
            throw new NameTaken;
        }
    }

    private function audited(User $user, string $action): User
    {
        $this->audit->record($this->session->userId(), 'user', $user->id, $action, [
            'name' => $user->name, 'role' => $user->role->value, 'active' => $user->active,
        ]);

        return $user;
    }
}
