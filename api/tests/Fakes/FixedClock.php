<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Clock;

final class FixedClock implements Clock
{
    public function __construct(public \DateTimeImmutable $now = new \DateTimeImmutable('2026-11-16 12:00:00+00:00')) {}

    public function now(): \DateTimeImmutable
    {
        return $this->now;
    }
}
