<?php

declare(strict_types=1);

use App\Application\Settings\ManageSettings;
use App\Application\Settings\SettingsRepository;
use App\Domain\Money\Locale;
use App\Domain\Settings\InvalidDeliveryFee;
use App\Domain\Settings\PaperWidth;
use App\Domain\Settings\Settings;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemorySessionAuth;

it('saves the settings and audits the new values', function (): void {
    $repo = new class implements SettingsRepository
    {
        public ?Settings $saved = null;

        public function get(): Settings
        {
            return $this->saved ?? Settings::defaults();
        }

        public function save(Settings $settings): void
        {
            $this->saved = $settings;
        }
    };
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(3);
    $manage = new ManageSettings($repo, new ImmediateTransaction, $audit, $session);

    expect($manage->get())->toEqual(Settings::defaults());

    $settings = new Settings('Sushi Ya', Locale::En, PaperWidth::Mm58, true, 500);
    $manage->update($settings);

    expect($manage->get())->toBe($settings)
        ->and($audit->entries)->toBe([[
            'userId' => 3, 'entity' => 'settings', 'entityId' => 'settings', 'action' => 'update',
            'summary' => [
                'restaurant_name' => 'Sushi Ya', 'language' => 'en', 'paper_width' => 58,
                'delivery_fee_enabled' => true, 'delivery_fee_cents' => 500,
            ],
            'note' => null,
        ]]);
});

it('rejects a negative delivery fee', function (): void {
    new Settings('X', Locale::PtBR, PaperWidth::Mm80, true, -1);
})->throws(InvalidDeliveryFee::class);
