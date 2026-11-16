<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class CustomerNameRequired extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.customer_name_required', 'An order needs a customer name.');
    }
}
