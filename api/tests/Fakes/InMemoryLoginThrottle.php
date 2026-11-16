<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Auth\LoginThrottle;
use App\Domain\Auth\LoginThrottled;
use Closure;

/** Counts failures per key; tests set `locked` (seconds left) directly. */
final class InMemoryLoginThrottle implements LoginThrottle
{
    /** @var array<string, int> */
    public array $failures = [];

    /** @var array<string, int> */
    public array $locked = [];

    /** @var list<string> attempted keys, in order; `held` is true only while `$check` runs */
    public array $attempts = [];

    public bool $held = false;

    public function attempt(string $key, Closure $check): bool
    {
        $this->attempts[] = $key;
        if (($this->locked[$key] ?? 0) > 0) {
            throw new LoginThrottled($this->locked[$key]);
        }

        $this->held = true;
        $ok = $check();
        $this->held = false;

        if ($ok) {
            unset($this->failures[$key], $this->locked[$key]);
        } else {
            $this->failures[$key] = ($this->failures[$key] ?? 0) + 1;
        }

        return $ok;
    }

    public function clear(string $key): void
    {
        unset($this->failures[$key], $this->locked[$key]);
    }
}
