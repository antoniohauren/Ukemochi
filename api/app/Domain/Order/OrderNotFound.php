<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class OrderNotFound extends DomainException
{
    public function __construct(int $id)
    {
        parent::__construct('order.not_found', "No order with number {$id}.");
    }
}
