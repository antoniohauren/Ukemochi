<?php

declare(strict_types=1);

namespace App\Application\Health;

interface DatabaseProbe
{
    public function isUp(): bool;
}
