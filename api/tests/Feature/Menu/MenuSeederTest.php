<?php

declare(strict_types=1);

use Database\Seeders\MenuSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('gives every variant a ticket label that fits one line', function (): void {
    (new MenuSeeder)->run();

    expect(DB::table('variants')->whereNull('print_name')->count())->toBe(0)
        ->and(DB::table('variants')->where('price_cents', '<=', 0)->count())->toBe(0)
        ->and(DB::table('variants')->whereRaw('char_length(print_name) > ?', [MenuSeeder::MAX_LABEL])->count())->toBe(0)
        ->and(DB::table('variants')->count())->toBeGreaterThan(100);
});

it('does not seed twice', function (): void {
    (new MenuSeeder)->run();
    $count = DB::table('variants')->count();
    (new MenuSeeder)->run();

    expect(DB::table('variants')->count())->toBe($count);
});
