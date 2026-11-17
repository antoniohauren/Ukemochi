<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class ShiftAlreadyOpen extends DomainException
{
    public function __construct()
    {
        parent::__construct('cash.shift_already_open', 'A shift is already open; close it first.');
    }
}
