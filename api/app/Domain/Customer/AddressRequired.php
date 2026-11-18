<?php

declare(strict_types=1);

namespace App\Domain\Customer;

use App\Domain\DomainException;

final class AddressRequired extends DomainException
{
    public function __construct()
    {
        parent::__construct('customer.address_required', 'An address needs text.');
    }
}
