<?php

declare(strict_types=1);

use App\Application\Auth\Login;
use App\Domain\Auth\InvalidCredentials;
use App\Domain\Auth\LoginThrottled;
use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryLoginThrottle;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemoryUserRepository;
use Tests\Fakes\PlainPinHasher;

/** @return array{Login, InMemorySessionAuth, InMemoryLoginThrottle, InMemoryAuditLog, PlainPinHasher} */
function loginFixture(): array
{
    $users = new InMemoryUserRepository;
    $users->add(new User(7, 'Amanda', Role::Waitress, true, 'hashed:1234'));
    $users->add(new User(8, 'Bia', Role::Kitchen, false, 'hashed:5678'));
    $throttle = new InMemoryLoginThrottle;
    $hasher = new PlainPinHasher($throttle);
    $session = new InMemorySessionAuth;
    $audit = new InMemoryAuditLog;

    return [new Login($users, $hasher, $session, $throttle, $audit), $session, $throttle, $audit, $hasher];
}

it('logs in with the right PIN, ignoring name case', function (): void {
    [$login, $session, , $audit] = loginFixture();

    expect($login->execute('amanda', '1234')->id)->toBe(7)
        ->and($session->userId)->toBe(7)
        ->and($audit->entries)->toBe([
            ['userId' => 7, 'entity' => 'user', 'entityId' => 7, 'action' => 'login', 'summary' => [], 'note' => null],
        ]);
});

it('checks the PIN inside the throttle lock, keyed by user id', function (): void {
    [$login, , $throttle, , $hasher] = loginFixture();

    $login->execute('AMANDA', '1234');
    expect(fn () => $login->execute('amanda', '0000'))->toThrow(InvalidCredentials::class);

    expect($throttle->attempts)->toBe(['user:7', 'user:7'])
        ->and($hasher->verifiedUnderLock)->toBe([true, true]);
});

it('keys unknown names on the trimmed lowercase name, hashing under the lock', function (): void {
    [$login, , $throttle, , $hasher] = loginFixture();

    expect(fn () => $login->execute('  NoBody ', '1234'))->toThrow(InvalidCredentials::class)
        ->and($throttle->attempts)->toBe(['name:nobody'])
        ->and($throttle->failures)->toBe(['name:nobody' => 1])
        ->and($hasher->hashed)->toBe(1)
        ->and($hasher->verifiedUnderLock)->toBe([true]);
});

it('clears earlier failures on success', function (): void {
    [$login, , $throttle] = loginFixture();
    $throttle->failures['user:7'] = 3;

    $login->execute('amanda', '1234');

    expect($throttle->failures)->toBe([]);
});

it('rejects a wrong PIN, counts the failure and audits it without the typed name', function (): void {
    [$login, $session, $throttle, $audit] = loginFixture();

    expect(fn () => $login->execute('Amanda', '0000'))->toThrow(InvalidCredentials::class)
        ->and($session->userId)->toBeNull()
        ->and($throttle->failures)->toBe(['user:7' => 1])
        ->and($audit->entries)->toBe([[
            'userId' => null, 'entity' => 'auth', 'entityId' => 7, 'action' => 'login_failed',
            'summary' => ['user_id' => 7], 'note' => null,
        ]]);
});

it('audits an unknown name without storing what was typed', function (): void {
    [$login, , , $audit] = loginFixture();

    expect(fn () => $login->execute('4321', '1234'))->toThrow(InvalidCredentials::class)
        ->and($audit->entries)->toBe([[
            'userId' => null, 'entity' => 'auth', 'entityId' => 'unknown', 'action' => 'login_failed',
            'summary' => ['user_id' => null], 'note' => null,
        ]]);
});

it('rejects an inactive user even with the right PIN', function (): void {
    [$login, $session, $throttle] = loginFixture();

    expect(fn () => $login->execute('Bia', '5678'))->toThrow(InvalidCredentials::class)
        ->and($session->userId)->toBeNull()
        ->and($throttle->failures)->toBe(['user:8' => 1]);
});

it('refuses while the name is locked out, even with the right PIN', function (): void {
    [$login, $session, $throttle, $audit, $hasher] = loginFixture();
    $throttle->locked['user:7'] = 4;

    $thrown = null;
    try {
        $login->execute('Amanda', '1234');
    } catch (LoginThrottled $e) {
        $thrown = $e;
    }

    expect($thrown?->retryAfter)->toBe(4)
        ->and($thrown?->context)->toBe(['retry_after' => 4])
        ->and($hasher->verifiedUnderLock)->toBe([])
        ->and($session->userId)->toBeNull()
        ->and($audit->entries)->toBe([]);
});
