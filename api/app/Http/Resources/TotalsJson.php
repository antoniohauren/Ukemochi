<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Ticket\Totals;

/** Footer keys shared by the kitchen ticket and bill JSON. */
final class TotalsJson
{
    /** @return array<string, mixed> */
    public static function of(Totals $t): array
    {
        return [
            'subtotal_cents' => $t->subtotalCents, 'delivery_fee_cents' => $t->deliveryFeeCents, 'total_cents' => $t->totalCents,
            'pay_on_delivery' => $t->payOnDelivery, 'pay_method' => $t->payMethod?->value,
            'change_for_cents' => $t->changeForCents, 'change_cents' => $t->changeCents,
        ];
    }
}
