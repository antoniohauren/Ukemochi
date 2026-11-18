<?php

declare(strict_types=1);

namespace App\Domain\Customer;

use App\Domain\DomainException;

final class PhoneTaken extends DomainException
{
    public function __construct()
    {
        parent::__construct('customer.phone_taken', 'Another customer has this phone.');
    }
}
