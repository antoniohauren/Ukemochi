<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

final class UserNotFound extends DomainException
{
    public function __construct(int $id)
    {
        parent::__construct('user.not_found', "No user with id {$id}.");
    }
}
