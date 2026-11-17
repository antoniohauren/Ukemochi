<?php

declare(strict_types=1);

namespace App\Domain\Split;

use App\Domain\DomainException;

final class InvalidSplit extends DomainException
{
    public function __construct(string $message)
    {
        parent::__construct('split.invalid', $message);
    }
}
