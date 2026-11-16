<?php

declare(strict_types=1);

namespace App\Domain\Menu;

use App\Domain\DomainException;

final class InvalidPrice extends DomainException
{
    public function __construct()
    {
        parent::__construct('menu.invalid_price', 'Price cannot be negative.');
    }
}
