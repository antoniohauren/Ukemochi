<?php

declare(strict_types=1);

namespace App\Domain\Auth;

enum Role: string
{
    case Admin = 'admin';
    case Waitress = 'waitress';
    case Kitchen = 'kitchen';
}
