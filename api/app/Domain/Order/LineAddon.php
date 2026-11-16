<?php

declare(strict_types=1);

namespace App\Domain\Order;

/** Add-on on an order line: name and price snapshotted at the time of sale. */
final readonly class LineAddon
{
    public function __construct(public int $addonId, public string $name, public int $priceCents)
    {
        if ($priceCents < 0) {
            throw new InvalidAmount;
        }
    }
}
