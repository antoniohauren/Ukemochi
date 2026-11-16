<?php

declare(strict_types=1);

namespace App\Application\Menu;

use App\Domain\Menu\Menu;

final readonly class ReadMenu
{
    public function __construct(private MenuRepository $menu) {}

    public function execute(): Menu
    {
        return $this->menu->menu();
    }
}
