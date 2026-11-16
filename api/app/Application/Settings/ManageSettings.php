<?php

declare(strict_types=1);

namespace App\Application\Settings;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Transaction;
use App\Domain\Settings\Settings;

final readonly class ManageSettings
{
    public function __construct(
        private SettingsRepository $settings,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
    ) {}

    public function get(): Settings
    {
        return $this->settings->get();
    }

    /** Saves every setting at once and audits the new values. */
    public function update(Settings $settings): Settings
    {
        $this->transaction->run(function () use ($settings): void {
            $this->settings->save($settings);
            $this->audit->record($this->session->userId(), 'settings', 'settings', 'update', [
                'restaurant_name' => $settings->restaurantName,
                'language' => $settings->language->value,
                'paper_width' => $settings->paperWidth->value,
                'delivery_fee_enabled' => $settings->deliveryFeeEnabled,
                'delivery_fee_cents' => $settings->deliveryFeeCents,
            ]);
        });

        return $settings;
    }
}
