<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

/** Same error for unknown name, wrong PIN and inactive user, so the name's existence never leaks. */
final class InvalidCredentials extends DomainException
{
    public function __construct()
    {
        parent::__construct('auth.invalid_credentials', 'Wrong name or PIN.');
    }
}
