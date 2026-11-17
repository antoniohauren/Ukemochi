<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class ShiftNotFound extends DomainException
{
    public function __construct(int $id)
    {
        parent::__construct('cash.shift_not_found', "No shift with id {$id}.");
    }
}
