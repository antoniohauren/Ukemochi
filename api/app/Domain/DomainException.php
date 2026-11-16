<?php

declare(strict_types=1);

namespace App\Domain;

/**
 * Base for business rule violations. `errorCode` is the stable string the
 * HTTP layer returns and the frontends translate.
 */
abstract class DomainException extends \DomainException
{
    public function __construct(public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }
}
