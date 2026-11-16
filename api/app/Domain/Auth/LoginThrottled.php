<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

final class LoginThrottled extends DomainException
{
    public function __construct(public readonly int $retryAfter)
    {
        parent::__construct('auth.throttled', 'Too many wrong PINs. Try again shortly.', ['retry_after' => $retryAfter]);
    }
}
