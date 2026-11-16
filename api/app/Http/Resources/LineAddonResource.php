<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\LineAddon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property LineAddon $resource */
final class LineAddonResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{addon_id: int, name: string, price_cents: int} */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['addon_id' => $r->addonId, 'name' => $r->name, 'price_cents' => $r->priceCents];
    }
}
