<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class AddressRequired extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.address_required', 'A delivery order needs an address.');
    }
}
