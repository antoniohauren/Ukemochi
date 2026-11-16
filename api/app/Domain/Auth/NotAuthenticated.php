<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

final class NotAuthenticated extends DomainException
{
    public function __construct()
    {
        parent::__construct('unauthenticated', 'Unauthenticated.');
    }
}
