<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidQty extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.invalid_qty', 'Quantity must be at least 1.');
    }
}
