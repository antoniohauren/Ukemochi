<?php

declare(strict_types=1);

use App\Application\Staff\ManageStaff;
use App\Domain\Auth\InvalidPin;
use App\Domain\Auth\LastAdmin;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use App\Domain\Auth\UserNotFound;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryLoginThrottle;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemorySessionRevoker;
use Tests\Fakes\InMemoryUserRepository;
use Tests\Fakes\PlainPinHasher;

/** @return array{ManageStaff, InMemoryUserRepository, InMemoryAuditLog, InMemorySessionRevoker, InMemoryLoginThrottle} */
function manageStaff(): array
{
    $users = new InMemoryUserRepository;
    $users->add(new User(1, 'Boss', Role::Admin, true, 'hashed:0000'));
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(1);

    $revoker = new InMemorySessionRevoker;
    $throttle = new InMemoryLoginThrottle;

    return [new ManageStaff($users, new PlainPinHasher, new ImmediateTransaction, $audit, $session, $revoker, $throttle), $users, $audit, $revoker, $throttle];
}

it('creates a user with a hashed PIN and audits it without the PIN', function (): void {
    [$staff, $users, $audit] = manageStaff();
    $user = $staff->create('Amanda', Role::Waitress, '1234', false);

    expect($users->find($user->id))->toEqual(new User(2, 'Amanda', Role::Waitress, false, 'hashed:1234'))
        ->and($audit->entries)->toBe([[
            'userId' => 1, 'entity' => 'user', 'entityId' => 2, 'action' => 'create',
            'summary' => ['name' => 'Amanda', 'role' => 'waitress', 'active' => false], 'note' => null,
        ]]);
});

it('rejects a taken name ignoring case', function (): void {
    [$staff] = manageStaff();
    $staff->create('boss', Role::Kitchen, '1234', true);
})->throws(NameTaken::class);

it('rejects a PIN that is not 4 digits', function (): void {
    [$staff] = manageStaff();
    $staff->create('Amanda', Role::Kitchen, '12345', true);
})->throws(InvalidPin::class);

it('updates name, role and active and keeps the PIN', function (): void {
    [$staff, $users, $audit] = manageStaff();
    $id = $staff->create('Amanda', Role::Waitress, '1234', true)->id;
    $staff->update($id, 'Amanda S', Role::Kitchen, false);

    expect($users->find($id))->toEqual(new User($id, 'Amanda S', Role::Kitchen, false, 'hashed:1234'))
        ->and($audit->entries[1]['action'])->toBe('update')
        ->and($audit->entries[1]['summary'])->toBe(['name' => 'Amanda S', 'role' => 'kitchen', 'active' => false]);
});

it('lets a user keep their own name with another case', function (): void {
    [$staff, $users] = manageStaff();
    $staff->update(1, 'BOSS', Role::Admin, true);

    expect($users->find(1)?->name)->toBe('BOSS');
});

it('rejects renaming to another user\'s name', function (): void {
    [$staff] = manageStaff();
    $id = $staff->create('Amanda', Role::Waitress, '1234', true)->id;
    $staff->update($id, 'Boss', Role::Waitress, true);
})->throws(NameTaken::class);

it('refuses to demote or deactivate the last active admin', function (Role $role, bool $active): void {
    [$staff, $users] = manageStaff();
    $users->add(new User(2, 'Old', Role::Admin, false, 'x'));

    expect(fn () => $staff->update(1, 'Boss', $role, $active))->toThrow(LastAdmin::class)
        ->and($users->find(1)?->active)->toBeTrue();
})->with([
    'demote' => [Role::Waitress, true],
    'deactivate' => [Role::Admin, false],
]);

it('demotes an admin while another active admin is left', function (): void {
    [$staff, $users] = manageStaff();
    $staff->create('Second', Role::Admin, '1234', true);
    $staff->update(1, 'Boss', Role::Waitress, false);

    expect($users->find(1)?->role)->toBe(Role::Waitress);
});

it('resets the PIN and audits it without the PIN', function (): void {
    [$staff, $users, $audit] = manageStaff();
    $staff->resetPin(1, '9876', 'sid');

    expect($users->find(1)?->pinHash)->toBe('hashed:9876')
        ->and($audit->entries)->toBe([[
            'userId' => 1, 'entity' => 'user', 'entityId' => 1, 'action' => 'reset_pin', 'summary' => [], 'note' => null,
        ]]);
});

it('fails for an unknown user', function (Closure $call): void {
    [$staff] = manageStaff();
    $call($staff);
})->with([
    'update' => [fn (ManageStaff $s) => $s->update(99, 'X', Role::Kitchen, true)],
    'reset pin' => [fn (ManageStaff $s) => $s->resetPin(99, '1234', null)],
])->throws(UserNotFound::class);

it('ends the user\'s sessions and clears their wrong-PIN delay on reset', function (): void {
    [$staff, , , $revoker, $throttle] = manageStaff();
    $id = $staff->create('Amanda', Role::Waitress, '1234', true)->id;
    $throttle->failures["user:{$id}"] = 3;
    $throttle->locked["user:{$id}"] = 30;

    $staff->resetPin($id, '9876', 'admin-session');

    expect($revoker->revoked)->toBe([[$id, null]])
        ->and($throttle->failures)->toBe([])
        ->and($throttle->locked)->toBe([]);
});

it('keeps the caller\'s own session on a self-reset', function (): void {
    [$staff, , , $revoker] = manageStaff();
    $staff->resetPin(1, '9876', 'admin-session');

    expect($revoker->revoked)->toBe([[1, 'admin-session']]);
});

it('ends the sessions only when a user is deactivated', function (): void {
    [$staff, , , $revoker] = manageStaff();
    $id = $staff->create('Amanda', Role::Waitress, '1234', true)->id;
    $staff->update($id, 'Amanda', Role::Kitchen, true);
    $staff->update($id, 'Amanda', Role::Kitchen, false);
    $staff->update($id, 'Amanda', Role::Kitchen, false);

    expect($revoker->revoked)->toBe([[$id, null]]);
});
