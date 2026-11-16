<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

final class NameTaken extends DomainException
{
    public function __construct()
    {
        parent::__construct('user.name_taken', 'A user with this name already exists.');
    }
}
