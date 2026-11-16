<?php

declare(strict_types=1);

use App\Application\Auth\UserRepository;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\Role;
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
