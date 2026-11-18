<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\travelTo;

const DIR = '/tmp/ukemochi-backup-api-test';

beforeEach(function (): void {
    File::deleteDirectory(DIR);
    config(['backup.dir' => DIR]);
    travelTo(CarbonImmutable::parse('2026-11-16 23:00:00+00:00'));
});

it('dumps the database when a shift closes, lists it and downloads it as a pg_restore file', function (): void {
    actAs(Role::Waitress);
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();
    postJson('/api/shifts/current/close', ['counted_cents' => 0])->assertOk();

    actAs(Role::Admin);
    $list = getJson('/api/backups')->assertOk();
    expect($list->json())->toBe(['backups' => [[
        'name' => 'ukemochi-20261116-230000.dump', 'size_bytes' => $list->json('backups.0.size_bytes'), 'created_at' => $list->json('backups.0.created_at'),
    ]]])->and($list->json('backups.0.size_bytes'))->toBeGreaterThan(0)
        ->and(lastAudit())->toMatchArray(['user_id' => null, 'entity' => 'backup', 'action' => 'run']);

    get('/api/backups/ukemochi-20261116-230000.dump')->assertOk()->assertDownload('ukemochi-20261116-230000.dump');
    expect(file_get_contents(DIR.'/ukemochi-20261116-230000.dump', length: 5))->toBe('PGDMP');
});

it('runs from the daily command', function (): void {
    expect(Artisan::call('backup:run'))->toBe(0);

    expect(glob(DIR.'/ukemochi-*.dump'))->toHaveCount(1);
});

it('answers 404 for an unknown or malformed name', function (string $name): void {
    actAs(Role::Admin);
    getJson("/api/backups/{$name}")->assertNotFound();
})->with(['ukemochi-20261116-230000.dump', '..%2F.env', 'ukemochi-x.dump']);

it('is admin only', function (): void {
    actAs(Role::Waitress);
    getJson('/api/backups')->assertForbidden();
});
