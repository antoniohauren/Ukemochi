<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Split\Pick;
use App\Domain\Split\Share;
use App\Domain\Split\SplitResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Suggested shares and the amount nobody covers yet. `allocations` (units/goods only) can be sent back with the payment.
 *
 * @property SplitResult $resource
 */
final class SplitResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @param  list<Pick>  $picks
     * @return list<array{line_id: int, qty: string}>
     */
    public static function picks(array $picks): array
    {
        return array_map(fn (Pick $p) => ['line_id' => $p->lineId, 'qty' => (string) $p->qty], $picks);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'shares' => array_map(fn (Share $s) => [
                'payer_label' => $s->payerLabel, 'amount_cents' => $s->amountCents, 'allocations' => self::picks($s->picks),
            ], $this->resource->shares),
            'remainder_cents' => $this->resource->remainderCents,
        ];
    }
}
