<?php

declare(strict_types=1);

namespace App\Domain\Settings;

use App\Domain\Money\Locale;

/** Restaurant-wide settings. `language` is the default UI language. */
final readonly class Settings
{
    public function __construct(
        public string $restaurantName,
        public Locale $language,
        public PaperWidth $paperWidth,
        public bool $deliveryFeeEnabled,
        public int $deliveryFeeCents,
    ) {
        if ($deliveryFeeCents < 0) {
            throw new InvalidDeliveryFee;
        }
    }

    /** What a fresh install uses until an admin saves the settings. */
    public static function defaults(): self
    {
        return new self('Ukemochi', Locale::PtBR, PaperWidth::Mm80, false, 0);
    }
}
