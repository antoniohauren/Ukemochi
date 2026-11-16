<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Auth\LoginThrottled;
use Closure;

/** Wrong-PIN lockout per login key (growing delay, see PinDelay). */
interface LoginThrottle
{
    /**
     * Runs `$check` under a per-key lock, so parallel attempts cannot skip the delay:
     * refuses while the key is locked out, then records a failure or clears it.
     *
     * @param  Closure(): bool  $check  true when the credentials are right
     *
     * @throws LoginThrottled
     */
    public function attempt(string $key, Closure $check): bool;

    /** Drops the key's failures and lockout (e.g. after an admin resets the PIN). */
    public function clear(string $key): void;
}
