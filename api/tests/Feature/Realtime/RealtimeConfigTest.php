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
