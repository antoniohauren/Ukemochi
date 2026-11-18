<?php

declare(strict_types=1);

use App\Domain\Auth\Role;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

/**
 * @param  array<string, mixed>  $body
 * @return array<string, mixed>
 */
function customerBody(array $body = []): array
{
    return ['name' => 'Ana', 'phone' => '(11) 98765-4321', 'note' => 'VIP', 'addresses' => [
        ['text' => 'Rua A, 1', 'note' => 'portão azul'], ['text' => 'Rua B, 2'],
    ], ...$body];
}

it('creates a customer in the exact shape and audits it', function (): void {
    $user = actAs(Role::Waitress);
    $response = postJson('/api/customers', customerBody())->assertCreated();
    $id = createdId($response);

    $response->assertExactJson([
        'id' => $id, 'name' => 'Ana', 'phone' => '11987654321', 'note' => 'VIP', 'addresses' => [
            ['text' => 'Rua A, 1', 'note' => 'portão azul'], ['text' => 'Rua B, 2', 'note' => null],
        ],
    ]);
    getJson("/api/customers/{$id}")->assertOk()->assertExactJson((array) $response->json());
    expect(lastAudit())->toMatchArray([
        'user_id' => $user->id, 'entity' => 'customer', 'entity_id' => (string) $id, 'action' => 'create',
        'summary' => ['name' => 'Ana', 'phone' => '11987654321', 'note' => 'VIP', 'addresses' => ['Rua A, 1', 'Rua B, 2']],
    ]);
});

it('updates the profile and replaces the addresses', function (): void {
    actAs(Role::Admin);
    $id = createdId(postJson('/api/customers', customerBody())->assertCreated());

    putJson("/api/customers/{$id}", customerBody(['name' => 'Ana Maria', 'phone' => null, 'note' => null, 'addresses' => [['text' => 'Rua C, 3']]]))
        ->assertOk()->assertExactJson(['id' => $id, 'name' => 'Ana Maria', 'phone' => null, 'note' => null, 'addresses' => [['text' => 'Rua C, 3', 'note' => null]]]);
    expect(lastAudit()['action'])->toBe('update');
});

it('finds customers by phone digits or name', function (): void {
    actAs(Role::Waitress);
    $ana = createdId(postJson('/api/customers', customerBody())->assertCreated());
    $bia = createdId(postJson('/api/customers', customerBody(['name' => 'bia', 'phone' => '21 3333-4444', 'addresses' => []]))->assertCreated());

    expect(getJson('/api/customers?q=98765-4321')->assertOk()->json('customers.*.id'))->toBe([$ana])
        ->and(getJson('/api/customers?q=BI')->json('customers.*.id'))->toBe([$bia])
        ->and(getJson('/api/customers?q=50%25')->json('customers'))->toBe([])
        ->and(getJson('/api/customers')->json('customers.*.id'))->toBe([$ana, $bia]);
    getJson('/api/customers?q=bia')->assertExactJson(['customers' => [
        ['id' => $bia, 'name' => 'bia', 'phone' => '2133334444', 'note' => 'VIP', 'addresses' => []],
    ]]);
});

it('rejects a taken phone with 409 and a bad one with 422', function (): void {
    actAs(Role::Waitress);
    postJson('/api/customers', customerBody())->assertCreated();

    postJson('/api/customers', customerBody(['name' => 'Bia', 'phone' => '11987654321']))
        ->assertStatus(409)->assertJson(['code' => 'customer.phone_taken']);
    postJson('/api/customers', customerBody(['phone' => '123']))
        ->assertStatus(422)->assertJson(['code' => 'customer.invalid_phone']);
    postJson('/api/customers', customerBody(['addresses' => [['text' => '']]]))
        ->assertStatus(422)->assertJson(['code' => 'validation']);
});

it('answers 404 for a missing customer', function (): void {
    actAs(Role::Waitress);

    getJson('/api/customers/999')->assertNotFound()->assertJson(['code' => 'customer.not_found']);
    putJson('/api/customers/999', customerBody())->assertNotFound();
    getJson('/api/customers/999/orders')->assertNotFound();
});

it('keeps the kitchen out', function (): void {
    actAs(Role::Kitchen);

    getJson('/api/customers')->assertForbidden();
    postJson('/api/customers', customerBody())->assertForbidden();
});

it('links orders to the customer and lists them newest first', function (): void {
    actAs(Role::Waitress);
    $menu = orderApiMenu();
    $id = createdId(postJson('/api/customers', customerBody())->assertCreated());
    $first = createdId(placeOrder($menu['variant'], ['customer_id' => $id])->assertJson(['customer_id' => $id]));
    placeOrder($menu['variant']);
    $second = createdId(placeOrder($menu['variant'], ['customer_id' => $id]));

    $history = getJson("/api/customers/{$id}/orders")->assertOk();
    expect($history->json('orders.*.id'))->toBe([$second, $first])
        ->and($history->json('orders.0'))->toBe(getJson("/api/orders/{$second}")->json());
    expect(lastAudit()['summary'])->toMatchArray(['customer_id' => $id]);
});

it('rejects an order for an unknown customer', function (): void {
    actAs(Role::Waitress);
    postJson('/api/orders', dineInBody(orderApiMenu()['variant'], ['customer_id' => 999]))
        ->assertStatus(422)->assertJsonValidationErrors('customer_id');
});
