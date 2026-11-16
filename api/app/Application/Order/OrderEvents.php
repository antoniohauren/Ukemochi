<?php

declare(strict_types=1);

namespace App\Application\Order;

/** Tells live screens an order changed. Called after the change commits. */
interface OrderEvents
{
    public function updated(int $id, int $version): void;
}
