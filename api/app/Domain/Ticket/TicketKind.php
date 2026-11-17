<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

enum TicketKind: string
{
    case Kitchen = 'kitchen';
    case Bill = 'bill';
}
