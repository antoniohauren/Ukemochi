<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Settings\Settings;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Settings $resource */
final class SettingsResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{restaurant_name: string, language: string, paper_width: int, delivery_fee_enabled: bool, delivery_fee_cents: int} */
    public function toArray(Request $request): array
    {
        $s = $this->resource;

        return [
            'restaurant_name' => $s->restaurantName,
            'language' => $s->language->value,
            'paper_width' => $s->paperWidth->value,
            'delivery_fee_enabled' => $s->deliveryFeeEnabled,
            'delivery_fee_cents' => $s->deliveryFeeCents,
        ];
    }
}
