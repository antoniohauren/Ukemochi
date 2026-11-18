<?php

declare(strict_types=1);

namespace App\Domain\Stock;

enum StockStatus: string
{
    case Ok = 'ok';
    case Low = 'low';
    case Out = 'out';
}
