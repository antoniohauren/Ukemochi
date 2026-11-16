<?php

declare(strict_types=1);

namespace App\Domain\Money;

use App\Domain\DomainException;

final class InvalidMoney extends DomainException
{
    public static function unparsable(): self
    {
        return new self('money.invalid', 'Not a valid amount.');
    }

    public static function overflow(): self
    {
        return new self('money.overflow', 'Amount is too large.');
    }

    public static function invalidFraction(): self
    {
        return new self('money.invalid_fraction', 'Fraction denominator must be positive.');
    }
}
