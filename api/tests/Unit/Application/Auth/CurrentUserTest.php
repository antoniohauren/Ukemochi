<?php

declare(strict_types=1);

use App\Application\Auth\CurrentUser;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemoryUserRepository;

function currentUserWith(?int $sessionUserId, ?User $stored = null): CurrentUser
{
    $session = new InMemorySessionAuth;
    $session->userId = $sessionUserId;
    $users = new InMemoryUserRepository;
    if ($stored !== null) {
        $users->add($stored);
    }

    return new CurrentUser($session, $users);
}

it('returns the session user', function (): void {
    $user = currentUserWith(7, new User(7, 'Amanda', Role::Waitress, true, 'x'))->execute();

    expect($user->name)->toBe('Amanda');
});

it('fails without a session', function (): void {
    currentUserWith(null)->execute();
})->throws(NotAuthenticated::class);

it('fails when the session user is gone', function (): void {
    currentUserWith(7)->execute();
})->throws(NotAuthenticated::class);

it('fails when the session user was deactivated', function (): void {
    currentUserWith(7, new User(7, 'Amanda', Role::Waitress, false, 'x'))->execute();
})->throws(NotAuthenticated::class);
