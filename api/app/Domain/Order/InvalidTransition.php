<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidTransition extends DomainException
{
    public function __construct(OrderStatus $from, OrderStatus $to)
    {
        parent::__construct('order.invalid_transition', "Cannot move an order from {$from->value} to {$to->value}.", ['from' => $from->value, 'to' => $to->value]);
    }
}
