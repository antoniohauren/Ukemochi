<?php

declare(strict_types=1);

use App\Domain\Auth\Role;

use function Pest\Laravel\getJson;

it('gives signed-in staff the public Reverb app key', function (Role $role): void {
    config(['broadcasting.connections.reverb.key' => 'public-key']);
    actAs($role);

    getJson('/api/realtime')->assertOk()->assertExactJson(['key' => 'public-key']);
})->with([Role::Admin, Role::Waitress, Role::Kitchen]);

it('refuses a signed-out visitor', function (): void {
    getJson('/api/realtime')->assertUnauthorized();
});

it('answers 503 realtime.unavailable when no Reverb key is configured', function (mixed $key): void {
    config(['broadcasting.connections.reverb.key' => $key]);
    actAs(Role::Waitress);

    getJson('/api/realtime')->assertStatus(503)->assertJsonPath('code', 'realtime.unavailable');
})->with(['', null]);
