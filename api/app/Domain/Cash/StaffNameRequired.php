<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\DomainException;

final class StaffNameRequired extends DomainException
{
    public function __construct()
    {
        parent::__construct('cash.staff_name_required', 'A staff meal needs the staff name.');
    }
}
