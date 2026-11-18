<?php

declare(strict_types=1);

namespace App\Domain\Stock;

enum MovementKind: string
{
    case Sale = 'sale';
    case Purchase = 'purchase';
    case Adjust = 'adjust';
}
