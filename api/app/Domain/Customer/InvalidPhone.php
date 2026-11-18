<?php

declare(strict_types=1);

namespace App\Domain\Customer;

use App\Domain\DomainException;

final class InvalidPhone extends DomainException
{
    public function __construct()
    {
        parent::__construct('customer.invalid_phone', 'A phone has 11 digits: (88) 8.8888-8888.');
    }
}
