<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class OrderCancelled extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.cancelled', 'A cancelled order cannot change.');
    }
}
