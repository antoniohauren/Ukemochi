<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidDeliveryFee extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.invalid_delivery_fee', 'Only delivery orders have a delivery fee, and it cannot be negative.');
    }
}
