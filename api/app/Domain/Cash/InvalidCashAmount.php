<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class InvalidCashAmount extends DomainException
{
    public function __construct()
    {
        parent::__construct('cash.invalid_amount', 'Cash amounts cannot be negative, and a movement must be more than zero.');
    }
}
