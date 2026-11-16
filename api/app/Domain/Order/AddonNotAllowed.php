<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\DomainException;

final class AddonNotAllowed extends DomainException
{
    public function __construct(int $addonId)
    {
        parent::__construct('order.addon_not_allowed', "Add-on {$addonId} is not offered for this item.", ['addon_id' => $addonId]);
    }
}
