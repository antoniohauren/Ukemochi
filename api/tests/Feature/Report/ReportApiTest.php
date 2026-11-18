<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Carbon\CarbonImmutable;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\travelTo;

const PERIOD = '/api/reports?from=2026-11-16T00:00:00-03:00&to=2026-11-17T00:00:00-03:00';

it('sums the period by item, payment method and waitress, without cancelled orders, in the exact shape', function (): void {
    travelTo(CarbonImmutable::parse('2026-11-16 15:00:00+00:00'));
    $ana = actAs(Role::Waitress);
    ['variant' => $v, 'half' => $half, 'addon' => $addon] = orderApiMenu();
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();
    // 2 × (3200 + 300) + 1700 = 8700
    $a = createdId(placeOrder($v, ['lines' => [
        ['variant_id' => $v, 'qty' => 2, 'addon_ids' => [$addon]],
        ['variant_id' => $half, 'qty' => 1],
    ]]));
    postJson("/api/orders/{$a}/payments", ['method' => 'cash', 'amount_cents' => 5000])->assertCreated();
    postJson("/api/orders/{$a}/payments", ['method' => 'pix', 'amount_cents' => 3700])->assertCreated();
    $d = createdId(placeOrder($v));
    postJson("/api/orders/{$d}/payments", ['method' => 'debit', 'amount_cents' => 100])->assertCreated();
    $c = createdId(placeOrder($v));
    postJson("/api/orders/{$c}/cancel", ['reason' => 'desistiu'])->assertOk();

    $bia = actAs(Role::Waitress);
    $b = createdId(placeOrder($half));
    postJson("/api/orders/{$b}/payments", ['method' => 'credit', 'amount_cents' => 1700])->assertCreated();

    // Outside the period (the next local day).
    travelTo(CarbonImmutable::parse('2026-11-17 03:30:00+00:00'));
    placeOrder($v);

    actAs(Role::Admin);
    expect(getJson(PERIOD)->assertOk()->json())->toBe([
        'from' => '2026-11-16T03:00:00+00:00',
        'to' => '2026-11-17T03:00:00+00:00',
        'orders_count' => 3,
        'cancelled_count' => 1,
        'revenue_cents' => 8700 + 3200 + 1700,
        'by_item' => [
            ['item_name' => 'Philadelphia', 'variant_name' => 'Inteiro', 'qty' => 3, 'amount_cents' => 7000 + 3200],
            ['item_name' => 'Philadelphia', 'variant_name' => 'Meio', 'qty' => 2, 'amount_cents' => 3400],
        ],
        'by_method' => [
            ['method' => 'cash', 'count' => 1, 'amount_cents' => 5000],
            ['method' => 'pix', 'count' => 1, 'amount_cents' => 3700],
            ['method' => 'credit', 'count' => 1, 'amount_cents' => 1700],
            ['method' => 'debit', 'count' => 1, 'amount_cents' => 100],
        ],
        'by_waitress' => [
            ['user_id' => $ana->id, 'user_name' => $ana->name, 'orders_count' => 2, 'revenue_cents' => 8700 + 3200],
            ['user_id' => $bia->id, 'user_name' => $bia->name, 'orders_count' => 1, 'revenue_cents' => 1700],
        ],
    ]);
});

it('leaves voided payments out of the method totals', function (): void {
    travelTo(CarbonImmutable::parse('2026-11-16 15:00:00+00:00'));
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();
    $id = createdId(placeOrder($v));
    $payment = postJson("/api/orders/{$id}/payments", ['method' => 'cash', 'amount_cents' => 1000])->assertCreated()->json('payments.0.id');
    assert(is_int($payment));
    postJson("/api/payments/{$payment}/void")->assertOk();

    actAs(Role::Admin);
    getJson(PERIOD)->assertOk()->assertJsonPath('by_method', []);
});

it('rejects a missing or reversed period', function (string $query): void {
    actAs(Role::Admin);
    getJson("/api/reports{$query}")->assertUnprocessable();
})->with([
    'missing' => [''],
    'reversed' => ['?from=2026-11-17T00:00:00Z&to=2026-11-16T00:00:00Z'],
    'not a date' => ['?from=x&to=y'],
    'over a year' => ['?from=2025-01-01T00:00:00Z&to=2026-11-16T00:00:00Z'],
]);

it('is admin only', function (): void {
    actAs(Role::Waitress);
    getJson(PERIOD)->assertForbidden();
});
