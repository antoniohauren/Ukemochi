<?php

declare(strict_types=1);

namespace App\Domain\Split;

/** `qty` units of one order line, fractions allowed. */
final readonly class Pick
{
    public function __construct(public int $lineId, public Fraction $qty) {}
}
