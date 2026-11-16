<?php

declare(strict_types=1);

namespace App\Domain\Payment;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Credit = 'credit';
    case Debit = 'debit';
    case Pix = 'pix';
}
