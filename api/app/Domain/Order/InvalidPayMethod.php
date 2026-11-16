<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidPayMethod extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.invalid_pay_method', 'Pay on delivery needs a method, and change is only for cash.');
    }
}
