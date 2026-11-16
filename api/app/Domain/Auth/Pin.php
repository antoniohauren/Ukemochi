<?php

declare(strict_types=1);

namespace App\Domain\Auth;

/** A staff PIN is exactly 4 digits. */
final class Pin
{
    public static function assertValid(string $pin): void
    {
        if (preg_match('/^\d{4}\z/', $pin) !== 1) {
            throw new InvalidPin('user.invalid_pin', 'PIN must be exactly 4 digits.');
        }
    }
}
