<?php

declare(strict_types=1);

namespace App\Domain\Settings;

use App\Domain\DomainException;

final class InvalidDeliveryFee extends DomainException
{
    public function __construct()
    {
        parent::__construct('settings.invalid_delivery_fee', 'Delivery fee cannot be negative.');
    }
}
