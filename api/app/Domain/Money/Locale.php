<?php

declare(strict_types=1);

namespace App\Domain\Money;

enum Locale: string
{
    case PtBR = 'pt-BR';
    case En = 'en';
}
