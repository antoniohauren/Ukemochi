<?php

declare(strict_types=1);

namespace App\Domain\Customer;

use App\Domain\DomainException;

final class CustomerNotFound extends DomainException
{
    public function __construct(int $id)
    {
        parent::__construct('customer.not_found', "No customer with id {$id}.");
    }
}
