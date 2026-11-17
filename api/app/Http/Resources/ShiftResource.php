<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Cash\CashMovement;
use App\Domain\Cash\ShiftReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A shift with its movements and the money the domain computed.
 *
 * @property ShiftReport $resource
 */
final class ShiftResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $r = $this->resource;
        $s = $r->shift;

        return [
            'id' => $s->id, 'opened_by' => $s->openedBy, 'opened_at' => $s->openedAt->format(DATE_ATOM),
            'opening_float_cents' => $s->openingFloatCents, 'closed_by' => $s->closedBy, 'closed_at' => $s->closedAt?->format(DATE_ATOM),
            'counted_cents' => $s->countedCents, 'note' => $s->note,
            'movements' => array_map(fn (CashMovement $m) => [
                'id' => $m->id, 'kind' => $m->kind->value, 'amount_cents' => $m->amountCents, 'staff_name' => $m->staffName,
                'note' => $m->note, 'created_by' => $m->createdBy, 'created_at' => $m->createdAt->format(DATE_ATOM),
            ], $r->movements),
            'totals_by_method' => $r->totalsByMethod,
            'withdrawals_cents' => $r->withdrawalsCents, 'staff_meals_cents' => $r->staffMealsCents, 'deposits_cents' => $r->depositsCents,
            'expected_cents' => $r->expectedCents, 'difference_cents' => $r->differenceCents,
        ];
    }
}
