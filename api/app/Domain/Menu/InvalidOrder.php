<?php

declare(strict_types=1);

namespace App\Domain\Menu;

use App\Domain\DomainException;

final class InvalidOrder extends DomainException
{
    public function __construct()
    {
        parent::__construct('menu.invalid_order', 'The order must list every row exactly once.');
    }
}
