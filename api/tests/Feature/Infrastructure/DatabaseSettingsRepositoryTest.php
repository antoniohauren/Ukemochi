<?php

declare(strict_types=1);

use App\Application\Settings\SettingsRepository;
use App\Domain\Money\Locale;
use App\Domain\Settings\PaperWidth;
use App\Domain\Settings\Settings;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('returns the defaults when nothing is stored', function (): void {
    expect(app(SettingsRepository::class)->get())->toEqual(Settings::defaults());
});

it('stores typed values and overwrites them on the next save', function (): void {
    $repo = app(SettingsRepository::class);
    $repo->save(new Settings('A', Locale::En, PaperWidth::Mm58, true, 100));
    $repo->save($settings = new Settings('B', Locale::PtBR, PaperWidth::Mm80, false, 250));

    expect($repo->get())->toEqual($settings)
        ->and(DB::table('settings')->count())->toBe(5);
});

it('falls back to the default for a missing or malformed value', function (): void {
    DB::table('settings')->insert([
        ['key' => 'restaurant_name', 'value' => json_encode('Sushi Ya')],
        ['key' => 'paper_width', 'value' => json_encode(72)],
        ['key' => 'delivery_fee_cents', 'value' => json_encode(-5)],
    ]);

    expect(app(SettingsRepository::class)->get())->toEqual(new Settings('Sushi Ya', Locale::PtBR, PaperWidth::Mm80, false, 0));
});

it('rejects an unknown key', function (): void {
    DB::table('settings')->insert(['key' => 'theme', 'value' => json_encode('dark')]);
})->throws(QueryException::class);
