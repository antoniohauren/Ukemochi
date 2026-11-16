<?php

declare(strict_types=1);

use App\Application\Auth\UserRepository;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('creates and finds users by id and by name ignoring case', function (): void {
    $users = app(UserRepository::class);

    $created = $users->create('Amanda', 'hash', Role::Kitchen);

    expect($users->find($created->id))->toEqual($created)
        ->and($users->findByName('AMANDA'))->toEqual($created)
        ->and($users->findByName('Amand'))->toBeNull()
        ->and($created->active)->toBeTrue();
});

it('turns a duplicate name, ignoring case, into NameTaken', function (): void {
    app(UserRepository::class)->create('Amanda', 'hash', Role::Waitress);

    app(UserRepository::class)->create('amanda', 'hash', Role::Waitress);
})->throws(NameTaken::class);

it('does not mass-assign role or active', function (): void {
    $user = new EloquentUser(['name' => 'X', 'pin_hash' => 'h', 'role' => 'admin', 'active' => false]);

    expect($user->getAttributes())->toBe(['name' => 'X', 'pin_hash' => 'h']);
});

it('rejects an unknown role in the database', function (): void {
    DB::table('users')->insert(['name' => 'X', 'pin_hash' => 'h', 'role' => 'manager']);
})->throws(QueryException::class);

it('refuses to delete a user the audit log points at', function (): void {
    $user = app(UserRepository::class)->create('Amanda', 'hash', Role::Waitress);
    DB::table('audit_log')->insert(['user_id' => $user->id, 'at' => now(), 'entity' => 'user', 'entity_id' => '1', 'action' => 'x', 'summary' => '{}']);

    DB::table('users')->delete($user->id);
})->throws(QueryException::class);

it('updates, re-hashes and lists users by name', function (): void {
    $users = app(UserRepository::class);
    $bia = $users->create('bia', 'h1', Role::Kitchen, false);
    $amanda = $users->create('Amanda', 'h2', Role::Waitress);

    $updated = $users->update($bia->id, 'Bia', Role::Admin, true);

    expect($updated)->toEqual(new User($bia->id, 'Bia', Role::Admin, true, 'h1'))
        ->and($users->setPinHash($amanda->id, 'h3'))->toBeTrue()
        ->and($users->all())->toEqual([new User($amanda->id, 'Amanda', Role::Waitress, true, 'h3'), $updated])
        ->and($users->update(999999, 'X', Role::Admin, true))->toBeNull()
        ->and($users->setPinHash(999999, 'h'))->toBeFalse();
});

it('turns a rename onto a taken name into NameTaken', function (): void {
    $users = app(UserRepository::class);
    $users->create('Amanda', 'h', Role::Waitress);
    $bia = $users->create('Bia', 'h', Role::Waitress);

    $users->update($bia->id, 'AMANDA', Role::Waitress, true);
})->throws(NameTaken::class);

it('lists only active admins when locking them', function (): void {
    $users = app(UserRepository::class);
    $admin = $users->create('A', 'h', Role::Admin);
    $users->create('B', 'h', Role::Admin, false);
    $users->create('C', 'h', Role::Waitress);

    expect(DB::transaction(fn () => $users->lockActiveAdminIds()))->toBe([$admin->id]);
});
