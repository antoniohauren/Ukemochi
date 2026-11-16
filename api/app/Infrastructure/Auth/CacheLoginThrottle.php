<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Application\Auth\LoginThrottle;
use App\Application\Clock;
use App\Domain\Auth\LoginThrottled;
use App\Domain\Auth\PinDelay;
use Closure;
use Illuminate\Contracts\Cache\LockProvider;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Cache\Repository as Cache;

final readonly class CacheLoginThrottle implements LoginThrottle
{
    // Failure count is forgotten a day after the last wrong PIN.
    private const int REMEMBER_SECONDS = 86400;

    // Longest a check may hold the lock (one hash takes well under a second).
    private const int LOCK_SECONDS = 10;

    public function __construct(private Cache $cache, private Clock $clock, private int $lockWaitSeconds = 5) {}

    public function attempt(string $key, Closure $check): bool
    {
        $store = $this->cache->getStore();
        assert($store instanceof LockProvider);
        $stateKey = 'login-pin:'.hash('sha256', $key);

        try {
            return $store->lock("{$stateKey}:lock", self::LOCK_SECONDS)->block(
                $this->lockWaitSeconds,
                fn (): bool => $this->locked($stateKey, $check),
            ) === true;
        } catch (LockTimeoutException) {
            // Another attempt for this key is still running: same answer as a lockout.
            throw new LoginThrottled(1);
        }
    }

    /** @param  Closure(): bool  $check */
    private function locked(string $stateKey, Closure $check): bool
    {
        $state = $this->state($stateKey);
        $now = $this->clock->now()->getTimestamp();
        if ($state['until'] > $now) {
            throw new LoginThrottled($state['until'] - $now);
        }

        if ($check()) {
            $this->cache->forget($stateKey);

            return true;
        }

        $failures = $state['failures'] + 1;
        $this->cache->put($stateKey, ['failures' => $failures, 'until' => $now + PinDelay::seconds($failures)], self::REMEMBER_SECONDS);

        return false;
    }

    /** @return array{failures: int, until: int} */
    private function state(string $stateKey): array
    {
        $state = $this->cache->get($stateKey);

        return is_array($state) && is_int($state['failures'] ?? null) && is_int($state['until'] ?? null)
            ? ['failures' => $state['failures'], 'until' => $state['until']]
            : ['failures' => 0, 'until' => 0];
    }
}
