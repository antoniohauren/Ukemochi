<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class ShiftClosed extends DomainException
{
    public function __construct()
    {
        parent::__construct('cash.shift_closed', 'This shift is already closed.');
    }
}
