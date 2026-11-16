<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class NoLines extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.no_lines', 'An order needs at least one line.');
    }
}
