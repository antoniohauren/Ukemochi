<?php

declare(strict_types=1);

use App\Application\Health\DatabaseProbe;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\instance;

it('answers the framework health check', function (): void {
    get('/up')->assertOk();
});

it('reports ok when the database is reachable', function (): void {
    getJson('/api/health')->assertOk()->assertExactJson(['status' => 'ok', 'db' => 'ok']);
});

it('reports 503 when the database is down', function (): void {
    instance(DatabaseProbe::class, new class implements DatabaseProbe
    {
        public function isUp(): bool
        {
            return false;
        }
    });

    getJson('/api/health')->assertStatus(503)->assertExactJson(['status' => 'unavailable', 'db' => 'down']);
});
