<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class LineNotFound extends DomainException
{
    public function __construct(int $lineId)
    {
        parent::__construct('order.line_not_found', "No line {$lineId} on this order.", ['line_id' => $lineId]);
    }
}
