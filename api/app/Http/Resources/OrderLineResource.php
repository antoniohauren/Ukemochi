<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\LineAddon;
use App\Domain\Order\OrderLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property OrderLine $resource */
final class OrderLineResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return [
            'id' => $r->id, 'variant_id' => $r->variantId, 'category_name' => $r->categoryName, 'item_name' => $r->itemName, 'variant_name' => $r->variantName, 'print_name' => $r->printName,
            'unit_price_cents' => $r->unitPriceCents, 'qty' => $r->qty, 'note' => $r->note,
            'addons' => array_map(fn (LineAddon $a) => (new LineAddonResource($a))->toArray($request), $r->addons),
            'total_cents' => $r->totalCents(),
        ];
    }
}
