<?php

declare(strict_types=1);

namespace App\Domain\Menu;

use App\Domain\DomainException;

final class LastVariant extends DomainException
{
    public function __construct()
    {
        parent::__construct('menu.last_variant', 'An item keeps at least one variant.');
    }
}
