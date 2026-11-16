<?php

declare(strict_types=1);

namespace App\Domain;

/**
 * Base for business rule violations. `errorCode` is the stable string the
 * HTTP layer returns and the frontends translate; `context` adds fields to the body.
 */
abstract class DomainException extends \DomainException
{
    /** @param  array<string, scalar>  $context */
    public function __construct(public readonly string $errorCode, string $message, public readonly array $context = [])
    {
        parent::__construct($message);
    }
}
