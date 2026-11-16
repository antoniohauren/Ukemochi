<?php

declare(strict_types=1);

namespace App\Infrastructure;

use App\Application\Clock;
use Carbon\CarbonImmutable;

final class SystemClock implements Clock
{
    public function now(): \DateTimeImmutable
    {
        // Carbon so tests can freeze time with travelTo().
        return CarbonImmutable::now();
    }
}
