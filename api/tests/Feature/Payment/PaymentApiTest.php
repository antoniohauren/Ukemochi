<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Order\OrderUpdated;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\travelTo;

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-11-16 12:00:00+00:00')));

/**
 * Opens a shift and places a dine-in R$32 order.
 *
 * @param  array<string, mixed>  $body
 * @return array{int, int} order id, shift id
 */
function payableOrder(array $body = []): array
{
    ['variant' => $v] = orderApiMenu();
    $shift = createdId(postJson('/api/shifts', ['opening_float_cents' => 10000])->assertCreated());

    return [createdId(placeOrder($v, $body)), $shift];
}

it('takes a cash payment with change and answers order + payments in the exact shape', function (): void {
    $user = actAs(Role::Waitress);
    [$id, $shift] = payableOrder();

    $response = postJson("/api/orders/{$id}/payments", [
        'method' => 'cash', 'amount_cents' => 2000, 'tendered_cents' => 5000, 'payer_label' => 'Ana', 'note' => 'nota de 50',
    ])->assertCreated();

    expect($response->json('order'))->toMatchArray(['id' => $id, 'status' => 'open', 'total_cents' => 3200, 'paid_cents' => 2000, 'balance_cents' => 1200])
        ->and($response->json('payments'))->toBe([[
            'id' => $response->json('payments.0.id'), 'order_id' => $id, 'shift_id' => $shift, 'method' => 'cash',
            'amount_cents' => 2000, 'tendered_cents' => 5000, 'change_cents' => 3000, 'payer_label' => 'Ana', 'note' => 'nota de 50',
            'created_by' => $user->id, 'created_at' => '2026-11-16T12:00:00+00:00', 'voided' => false, 'allocations' => [],
        ]])
        ->and(lastAudit())->toMatchArray(['entity' => 'order', 'entity_id' => (string) $id, 'action' => 'payment', 'note' => 'nota de 50']);
    expect(getJson("/api/orders/{$id}/payments")->assertOk()->json())->toBe($response->json());
});

it('keeps the order open once mixed payments cover it until the waitress closes it, and counts them on the shift', function (): void {
    actAs(Role::Waitress);
    [$id] = payableOrder();
    Event::fake([OrderUpdated::class]);

    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 1200])->assertCreated()->assertJsonPath('order.status', 'open');
    postJson("/api/orders/{$id}/payments", ['method' => 'cash', 'amount_cents' => 2000])->assertCreated()
        ->assertJsonPath('order.status', 'open')->assertJsonPath('order.balance_cents', 0);
    putJson("/api/orders/{$id}/status", ['status' => 'closed'])->assertOk();

    Event::assertDispatchedTimes(OrderUpdated::class, 3);
    getJson("/api/orders/{$id}")->assertJson(['paid_cents' => 3200, 'balance_cents' => 0, 'status' => 'closed']);
    getJson('/api/shifts/current')->assertJson(['shift' => [
        'totals_by_method' => ['cash' => 2000, 'credit' => 0, 'debit' => 0, 'pix' => 1200], 'expected_cents' => 12000,
    ]]);
});

it('keeps an upfront-paid delivery order active until it goes out', function (): void {
    actAs(Role::Waitress);
    [$id] = payableOrder(['type' => 'delivery', 'address_text' => 'Rua A, 1', 'delivery_fee_cents' => 700]);

    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 3900])->assertCreated()
        ->assertJsonPath('order.status', 'open')->assertJsonPath('order.balance_cents', 0);
    putJson("/api/orders/{$id}/status", ['status' => 'ready'])->assertOk();
    putJson("/api/orders/{$id}/status", ['status' => 'out_for_delivery'])->assertOk();
});

it('voids a payment, reopening the order, and leaves it out of the shift', function (): void {
    actAs(Role::Admin);
    [$id] = payableOrder();
    $payment = postJson("/api/orders/{$id}/payments", ['method' => 'cash', 'amount_cents' => 3200])->assertCreated()->json('payments.0.id');
    assert(is_int($payment));

    postJson("/api/payments/{$payment}/void", ['note' => 'errado'])->assertOk()
        ->assertJsonPath('order.status', 'open')->assertJsonPath('order.paid_cents', 0)->assertJsonPath('payments.0.voided', true);
    expect(lastAudit())->toMatchArray(['action' => 'void_payment', 'note' => 'errado']);
    postJson("/api/payments/{$payment}/void")->assertStatus(409)->assertJson(['code' => 'payment.voided']);
    postJson('/api/payments/999999/void')->assertNotFound()->assertJson(['code' => 'payment.not_found']);
    getJson('/api/shifts/current')->assertJsonPath('shift.totals_by_method.cash', 0);
});

it('refuses voids after the shift closed, payments without a shift or on cancelled orders', function (): void {
    actAs(Role::Admin);
    [$id] = payableOrder();
    $payment = postJson("/api/orders/{$id}/payments", ['method' => 'debit', 'amount_cents' => 100])->json('payments.0.id');
    assert(is_int($payment));
    postJson('/api/shifts/current/close', ['counted_cents' => 10000])->assertOk();

    postJson("/api/payments/{$payment}/void")->assertStatus(409)->assertJson(['code' => 'payment.shift_closed']);
    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 100])->assertStatus(409)->assertJson(['code' => 'cash.no_open_shift']);
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();
    postJson("/api/orders/{$id}/cancel", ['reason' => 'desistiu'])->assertOk();
    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 100])->assertStatus(422)->assertJson(['code' => 'order.cancelled']);
    postJson('/api/orders/999/payments', ['method' => 'pix', 'amount_cents' => 100])->assertNotFound();
});

it('validates payments', function (): void {
    actAs(Role::Waitress);
    [$id] = payableOrder();

    postJson("/api/orders/{$id}/payments", ['method' => 'cheque', 'amount_cents' => 0])->assertStatus(422)->assertJsonValidationErrors(['method', 'amount_cents']);
    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 100, 'tendered_cents' => 200])->assertStatus(422)->assertJsonValidationErrors('tendered_cents');
    postJson("/api/orders/{$id}/payments", ['method' => 'cash', 'amount_cents' => 100, 'tendered_cents' => 50])->assertStatus(422)->assertJsonValidationErrors('tendered_cents');
});

it('keeps payments away from the kitchen', function (): void {
    actAs(Role::Admin);
    [$id] = payableOrder();
    actAs(Role::Kitchen);

    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 100])->assertForbidden();
    getJson("/api/orders/{$id}/payments")->assertOk();
});

it('prints non-voided payments, change and balance on the bill', function (): void {
    actAs(Role::Waitress);
    [$id] = payableOrder();
    $voided = postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 500])->json('payments.0.id');
    assert(is_int($voided));
    postJson("/api/payments/{$voided}/void")->assertOk();
    postJson("/api/orders/{$id}/payments", ['method' => 'cash', 'amount_cents' => 2000, 'tendered_cents' => 5000, 'payer_label' => 'Ana'])->assertCreated();

    getJson("/api/orders/{$id}/ticket?kind=bill")->assertOk()->assertJson([
        'payments' => [['method' => 'cash', 'amount_cents' => 2000, 'tendered_cents' => 5000, 'change_cents' => 3000, 'payer_label' => 'Ana']],
        'paid_cents' => 2000, 'balance_cents' => 1200,
    ])->assertJsonCount(1, 'payments');
});
