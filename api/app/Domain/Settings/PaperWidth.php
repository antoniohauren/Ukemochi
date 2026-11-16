<?php

declare(strict_types=1);

namespace App\Domain\Settings;

/** Thermal printer roll width in mm. */
enum PaperWidth: int
{
    case Mm58 = 58;
    case Mm80 = 80;
}
