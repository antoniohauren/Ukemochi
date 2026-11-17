<?php

declare(strict_types=1);

namespace App\Domain\Cash;

/** Cash that enters or leaves the drawer without a sale. A staff meal leaves the drawer like a withdrawal. */
enum MovementKind: string
{
    case Withdrawal = 'withdrawal';
    case Deposit = 'deposit';
    case StaffMeal = 'staff_meal';
}
