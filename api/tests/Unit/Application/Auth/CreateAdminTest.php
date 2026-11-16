<?php

declare(strict_types=1);

use App\Application\Auth\CreateAdmin;
use App\Domain\Auth\InvalidPin;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Role;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryUserRepository;
use Tests\Fakes\PlainPinHasher;

it('creates an active admin with a hashed PIN and audits it', function (): void {
    $audit = new InMemoryAuditLog;

    $user = (new CreateAdmin(new InMemoryUserRepository, new PlainPinHasher, $audit))->execute('Dono', '4321');

    expect($user->role)->toBe(Role::Admin)
        ->and($user->active)->toBeTrue()
        ->and($user->pinHash)->toBe('hashed:4321')
        ->and($audit->entries)->toBe([[
            'userId' => null, 'entity' => 'user', 'entityId' => $user->id, 'action' => 'seed_admin',
            'summary' => ['name' => 'Dono', 'role' => 'admin'], 'note' => null,
        ]]);
});

it('rejects a PIN that is not 4 digits', function (): void {
    (new CreateAdmin(new InMemoryUserRepository, new PlainPinHasher, new InMemoryAuditLog))->execute('Dono', '123');
})->throws(InvalidPin::class);

it('rejects a name already in use, ignoring case', function (): void {
    $createAdmin = new CreateAdmin(new InMemoryUserRepository, new PlainPinHasher, new InMemoryAuditLog);
    $createAdmin->execute('Dono', '4321');
    $createAdmin->execute('DONO', '1111');
})->throws(NameTaken::class);
