<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidAmount extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.invalid_amount', 'Amounts cannot be negative.');
    }
}
