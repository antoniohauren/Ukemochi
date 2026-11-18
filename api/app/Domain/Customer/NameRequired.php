<?php

declare(strict_types=1);

namespace App\Domain\Customer;

use App\Domain\DomainException;

final class NameRequired extends DomainException
{
    public function __construct()
    {
        parent::__construct('customer.name_required', 'A customer needs a name.');
    }
}
