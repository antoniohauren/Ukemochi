<?php

declare(strict_types=1);

namespace App\Domain\Auth;

/** Lockout after wrong PINs for one name: 1s, 2s, 4s… capped at 30s. */
final class PinDelay
{
    public const int MAX_SECONDS = 30;

    public static function seconds(int $failures): int
    {
        if ($failures < 1) {
            return 0;
        }

        // Cap the exponent first so 2 ** n never overflows.
        return min(2 ** min($failures - 1, 5), self::MAX_SECONDS);
    }
}
