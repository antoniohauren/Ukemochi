<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class InvalidPrintVersion extends DomainException
{
    public function __construct()
    {
        parent::__construct('order.invalid_print_version', 'The order never had this version.');
    }
}
