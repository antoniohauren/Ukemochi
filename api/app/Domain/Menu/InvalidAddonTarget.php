<?php

declare(strict_types=1);

namespace App\Domain\Menu;

use App\Domain\DomainException;

final class InvalidAddonTarget extends DomainException
{
    public function __construct()
    {
        parent::__construct('menu.invalid_addon_target', 'An add-on belongs to exactly one item or one category.');
    }
}
