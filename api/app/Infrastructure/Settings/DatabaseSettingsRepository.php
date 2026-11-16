<?php

declare(strict_types=1);

namespace App\Infrastructure\Settings;

use App\Application\Settings\SettingsRepository;
use App\Domain\Money\Locale;
use App\Domain\Settings\PaperWidth;
use App\Domain\Settings\Settings;
use Illuminate\Database\ConnectionInterface;

/** One `settings` row per key; the value is jsonb so it keeps its type. */
final readonly class DatabaseSettingsRepository implements SettingsRepository
{
    public function __construct(private ConnectionInterface $db) {}

    public function get(): Settings
    {
        $d = Settings::defaults();
        $stored = [];
        foreach ($this->db->table('settings')->get(['key', 'value']) as $row) {
            /** @var object{key: string, value: string} $row */
            $stored[$row->key] = json_decode($row->value, true, flags: JSON_THROW_ON_ERROR);
        }
        $name = $stored['restaurant_name'] ?? null;
        $language = $stored['language'] ?? null;
        $width = $stored['paper_width'] ?? null;
        $enabled = $stored['delivery_fee_enabled'] ?? null;
        $fee = $stored['delivery_fee_cents'] ?? null;

        return new Settings(
            is_string($name) ? $name : $d->restaurantName,
            (is_string($language) ? Locale::tryFrom($language) : null) ?? $d->language,
            (is_int($width) ? PaperWidth::tryFrom($width) : null) ?? $d->paperWidth,
            is_bool($enabled) ? $enabled : $d->deliveryFeeEnabled,
            is_int($fee) && $fee >= 0 ? $fee : $d->deliveryFeeCents,
        );
    }

    public function save(Settings $settings): void
    {
        $values = [
            'restaurant_name' => $settings->restaurantName,
            'language' => $settings->language->value,
            'paper_width' => $settings->paperWidth->value,
            'delivery_fee_enabled' => $settings->deliveryFeeEnabled,
            'delivery_fee_cents' => $settings->deliveryFeeCents,
        ];
        $rows = [];
        foreach ($values as $key => $value) {
            $rows[] = ['key' => $key, 'value' => json_encode($value, JSON_THROW_ON_ERROR)];
        }
        $this->db->table('settings')->upsert($rows, ['key'], ['value']);
    }
}
