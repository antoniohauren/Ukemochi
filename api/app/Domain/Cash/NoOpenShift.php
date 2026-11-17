<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class NoOpenShift extends DomainException
{
    public function __construct()
    {
        parent::__construct('cash.no_open_shift', 'No cash shift is open; open one first.');
    }
}
