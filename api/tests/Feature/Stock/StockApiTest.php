<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\travelTo;

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-11-16 12:00:00+00:00')));

/**
 * @param  array<string, mixed>  $fields
 * @return array<string, mixed>
 */
function stockRow(int $variant, array $fields = []): array
{
    return [
        'variant_id' => $variant, 'item_name' => 'Philadelphia', 'variant_name' => 'Inteiro', 'track_stock' => false,
        'stock_min' => null, 'qty' => 0, 'sold_today' => 0, 'status' => 'out', ...$fields,
    ];
}

it('lists every variant in menu order in the exact shape', function (): void {
    actAs(Role::Waitress);
    ['variant' => $variant, 'half' => $half] = orderApiMenu();

    getJson('/api/stock')->assertOk()->assertExactJson(['stock' => [
        stockRow($variant),
        stockRow($half, ['variant_name' => 'Meio']),
    ]]);
});

it('configures, buys and counts, answering the level and auditing each', function (): void {
    $user = actAs(Role::Admin);
    ['variant' => $variant] = orderApiMenu();

    putJson("/api/stock/{$variant}", ['track_stock' => true, 'stock_min' => 5, 'note' => 'geladeira'])->assertOk()
        ->assertExactJson(stockRow($variant, ['track_stock' => true, 'stock_min' => 5]));
    expect(lastAudit())->toMatchArray(['user_id' => $user->id, 'entity' => 'variant', 'entity_id' => (string) $variant, 'action' => 'stock_configure', 'note' => 'geladeira']);

    postJson("/api/stock/{$variant}/purchases", ['qty' => 20])->assertCreated()
        ->assertExactJson(stockRow($variant, ['track_stock' => true, 'stock_min' => 5, 'qty' => 20, 'status' => 'ok']));

    postJson("/api/stock/{$variant}/adjustments", ['qty' => 4, 'note' => 'contagem'])->assertCreated()
        ->assertExactJson(stockRow($variant, ['track_stock' => true, 'stock_min' => 5, 'qty' => 4, 'status' => 'low']));
    expect(lastAudit())->toMatchArray(['action' => 'stock_adjust', 'note' => 'contagem']);

    putJson("/api/stock/{$variant}", ['track_stock' => true, 'stock_min' => null])->assertOk()->assertJson(['stock_min' => null, 'status' => 'ok']);
});

it('sells tracked units, takes the edit difference, gives them back on cancel and may go negative', function (): void {
    actAs(Role::Admin);
    ['variant' => $variant, 'half' => $half] = orderApiMenu();
    putJson("/api/stock/{$variant}", ['track_stock' => true, 'stock_min' => 5])->assertOk();
    postJson("/api/stock/{$variant}/purchases", ['qty' => 20])->assertCreated();

    $order = placeOrder($variant, ['lines' => [['variant_id' => $variant, 'qty' => 17], ['variant_id' => $half, 'qty' => 2]]]);
    getJson('/api/stock')->assertJsonPath('stock.0.qty', 3)->assertJsonPath('stock.0.sold_today', 17)->assertJsonPath('stock.0.status', 'low')
        ->assertJsonPath('stock.1.qty', 0);

    $id = createdId($order);
    putJson("/api/orders/{$id}", dineInBody($variant, ['lines' => [['id' => lineId($order), 'variant_id' => $variant, 'qty' => 25]]]))->assertOk();
    getJson('/api/stock')->assertJsonPath('stock.0.qty', -5)->assertJsonPath('stock.0.status', 'out');

    postJson("/api/orders/{$id}/cancel", ['reason' => 'desistiu'])->assertOk();
    getJson('/api/stock')->assertJsonPath('stock.0.qty', 20)->assertJsonPath('stock.0.sold_today', 0);

    expect(DB::table('stock_movements')->where('kind', 'sale')->orderBy('id')->pluck('qty_delta')->all())->toBe([-17, -8, 25]);
});

it('validates bodies and answers 404 for a missing variant', function (): void {
    actAs(Role::Admin);
    ['variant' => $variant] = orderApiMenu();

    putJson("/api/stock/{$variant}", ['track_stock' => 'x'])->assertUnprocessable()->assertJsonValidationErrors(['track_stock', 'stock_min']);
    postJson("/api/stock/{$variant}/purchases", ['qty' => -1])->assertUnprocessable()->assertJsonValidationErrors(['qty']);
    postJson("/api/stock/{$variant}/purchases", ['qty' => 0])->assertUnprocessable()->assertJson(['code' => 'stock.invalid_qty']);
    postJson('/api/stock/999999/adjustments', ['qty' => 1])->assertNotFound()->assertJson(['code' => 'menu.not_found']);
});

it('lets only admins change stock', function (Role $role): void {
    actAs($role);
    ['variant' => $variant] = orderApiMenu();

    getJson('/api/stock')->assertOk();
    putJson("/api/stock/{$variant}", ['track_stock' => true, 'stock_min' => null])->assertForbidden();
    postJson("/api/stock/{$variant}/purchases", ['qty' => 1])->assertForbidden();
    postJson("/api/stock/{$variant}/adjustments", ['qty' => 1])->assertForbidden();
})->with([Role::Waitress, Role::Kitchen]);

it('requires a session', function (): void {
    getJson('/api/stock')->assertUnauthorized();
});
