<?php

declare(strict_types=1);

use App\Application\Clock;
use App\Domain\Auth\LoginThrottled;
use App\Infrastructure\Auth\CacheLoginThrottle;
use Illuminate\Contracts\Cache\Repository;

use function Pest\Laravel\travel;

function throttle(): CacheLoginThrottle
{
    // No waiting for the lock, so a held lock shows up at once.
    return new CacheLoginThrottle(app(Repository::class), app(Clock::class), lockWaitSeconds: 0);
}

it('holds a per-key lock while the check runs', function (): void {
    $nested = null;

    throttle()->attempt('user:7', function () use (&$nested): bool {
        try {
            throttle()->attempt('user:7', fn (): bool => true);
        } catch (LoginThrottled $e) {
            $nested = $e;
        }

        return true;
    });

    expect($nested)->toBeInstanceOf(LoginThrottled::class);
});

it('does not block other keys', function (): void {
    $ran = false;

    throttle()->attempt('user:7', function () use (&$ran): bool {
        $ran = throttle()->attempt('user:8', fn (): bool => true);

        return true;
    });

    expect($ran)->toBeTrue();
});

it('releases the lock after a failed check', function (): void {
    expect(throttle()->attempt('user:7', fn (): bool => false))->toBeFalse();
    travel(1)->seconds();

    expect(throttle()->attempt('user:7', fn (): bool => true))->toBeTrue();
});
