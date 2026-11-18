<?php

declare(strict_types=1);

namespace App\Domain\Stock;

use App\Domain\DomainException;

final class InvalidStockQty extends DomainException
{
    public function __construct()
    {
        parent::__construct('stock.invalid_qty', 'A purchase must add at least one unit; a count and a minimum cannot be negative.');
    }
}
