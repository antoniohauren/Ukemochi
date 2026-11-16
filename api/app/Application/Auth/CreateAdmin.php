<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Application\Audit\AuditLog;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Pin;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;

/** Seeds an admin from the command line (first install, or a locked-out restaurant). */
final readonly class CreateAdmin
{
    public function __construct(private UserRepository $users, private PinHasher $hasher, private AuditLog $audit) {}

    public function execute(string $name, string $pin): User
    {
        Pin::assertValid($pin);
        if ($this->users->findByName($name) !== null) {
            throw new NameTaken;
        }

        $user = $this->users->create($name, $this->hasher->hash($pin), Role::Admin);
        $this->audit->record(null, 'user', $user->id, 'seed_admin', ['name' => $user->name, 'role' => $user->role->value]);

        return $user;
    }
}
