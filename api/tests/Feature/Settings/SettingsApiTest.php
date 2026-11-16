<?php

declare(strict_types=1);

use App\Domain\Auth\Role;

use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;

it('returns the defaults before anything is saved, to any role', function (Role $role): void {
    actAs($role);

    getJson('/api/settings')->assertOk()->assertExactJson([
        'restaurant_name' => 'Ukemochi', 'language' => 'pt-BR', 'paper_width' => 80,
        'delivery_fee_enabled' => false, 'delivery_fee_cents' => 0,
    ]);
})->with([Role::Admin, Role::Waitress, Role::Kitchen]);

it('saves every setting and audits it', function (): void {
    $admin = actAs(Role::Admin);
    $body = [
        'restaurant_name' => 'Sushi Ya', 'language' => 'en', 'paper_width' => 58,
        'delivery_fee_enabled' => true, 'delivery_fee_cents' => 700,
    ];

    putJson('/api/settings', $body)->assertOk()->assertExactJson($body);
    putJson('/api/settings', [...$body, 'delivery_fee_cents' => 800])->assertOk();

    actAs(Role::Waitress);
    getJson('/api/settings')->assertExactJson([...$body, 'delivery_fee_cents' => 800]);
    expect(lastAudit())->toMatchArray([
        'user_id' => $admin->id, 'entity' => 'settings', 'entity_id' => 'settings', 'action' => 'update',
        'summary' => [...$body, 'delivery_fee_cents' => 800],
    ]);
});

it('validates the body', function (array $body, array $fields): void {
    actAs(Role::Admin);

    putJson('/api/settings', $body)->assertUnprocessable()->assertJsonPath('code', 'validation')->assertJsonValidationErrors($fields);
})->with([
    'empty' => [[], ['restaurant_name', 'language', 'paper_width', 'delivery_fee_enabled', 'delivery_fee_cents']],
    'bad values' => [[
        'restaurant_name' => 'X', 'language' => 'fr', 'paper_width' => 72,
        'delivery_fee_enabled' => 'maybe', 'delivery_fee_cents' => -1,
    ], ['language', 'paper_width', 'delivery_fee_enabled', 'delivery_fee_cents']],
]);

it('lets only admins change settings', function (Role $role): void {
    actAs($role);

    putJson('/api/settings', [
        'restaurant_name' => 'X', 'language' => 'en', 'paper_width' => 58, 'delivery_fee_enabled' => false, 'delivery_fee_cents' => 0,
    ])->assertForbidden();
})->with([Role::Waitress, Role::Kitchen]);

it('answers 401 without a session', function (): void {
    getJson('/api/settings')->assertUnauthorized();
});
