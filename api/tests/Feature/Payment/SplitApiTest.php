<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

/**
 * Dine-in: 3 × Philadelphia Inteiro (R$32) + 1 × Meio (R$17) = R$113, shift open.
 *
 * @return TestResponse<JsonResponse>
 */
function splitOrder(): TestResponse
{
    ['variant' => $v, 'half' => $half] = orderApiMenu();
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();

    return placeOrder($v, ['lines' => [['variant_id' => $v, 'qty' => 3], ['variant_id' => $half, 'qty' => 1]]]);
}

it('splits the balance equally and answers in the exact shape', function (): void {
    actAs(Role::Waitress);
    $id = createdId(splitOrder());
    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 1300])->assertCreated();

    postJson("/api/orders/{$id}/split", ['mode' => 'equal', 'n' => 3])->assertOk()->assertExactJson([
        'shares' => [
            ['payer_label' => null, 'amount_cents' => 3334, 'allocations' => []],
            ['payer_label' => null, 'amount_cents' => 3333, 'allocations' => []],
            ['payer_label' => null, 'amount_cents' => 3333, 'allocations' => []],
        ],
        'remainder_cents' => 0,
    ]);
});

it('splits by amount, the last payer taking the rest', function (): void {
    actAs(Role::Waitress);
    $id = createdId(splitOrder());

    expect(postJson("/api/orders/{$id}/split", ['mode' => 'amount', 'amounts' => [5000]])->assertOk()->json('shares.*.amount_cents'))
        ->toBe([5000, 6300]);
    postJson("/api/orders/{$id}/split", ['mode' => 'amount', 'amounts' => [20000]])->assertStatus(422)->assertJson(['code' => 'split.invalid']);
});

it('splits by units with fractions and keeps the remainder visible', function (): void {
    actAs(Role::Waitress);
    $order = splitOrder();
    $id = createdId($order);
    $roll = lineId($order);

    postJson("/api/orders/{$id}/split", ['mode' => 'units', 'payers' => [
        ['label' => 'Ana', 'picks' => [['line_id' => $roll, 'qty' => '1'], ['line_id' => $roll, 'qty' => '1/3']]],
        ['label' => 'Bia', 'picks' => [['line_id' => $roll, 'qty' => '0.5']]],
    ]])->assertOk()->assertExactJson([
        'shares' => [
            ['payer_label' => 'Ana', 'amount_cents' => 3200 + 1067, 'allocations' => [['line_id' => $roll, 'qty' => '1'], ['line_id' => $roll, 'qty' => '1/3']]],
            ['payer_label' => 'Bia', 'amount_cents' => 1600, 'allocations' => [['line_id' => $roll, 'qty' => '1/2']]],
        ],
        'remainder_cents' => 11300 - 4267 - 1600,
    ]);
    postJson("/api/orders/{$id}/split", ['mode' => 'units', 'payers' => [['picks' => [['line_id' => $roll, 'qty' => '4']]]]])
        ->assertStatus(422)->assertJson(['code' => 'split.invalid']);
});

it('splits by consumed lines', function (): void {
    actAs(Role::Waitress);
    $order = splitOrder();
    $id = createdId($order);

    expect(postJson("/api/orders/{$id}/split", ['mode' => 'goods', 'payers' => [
        ['label' => 'Ana', 'line_ids' => [lineId($order)]], ['label' => 'Bia', 'line_ids' => [lineId($order, 1)]],
    ]])->assertOk()->json())->toMatchArray(['remainder_cents' => 0])
        ->and(postJson("/api/orders/{$id}/split", ['mode' => 'goods', 'payers' => [['line_ids' => [lineId($order, 1)]]]])->json('shares.0.amount_cents'))->toBe(1700);
});

it('validates the split body', function (): void {
    actAs(Role::Waitress);
    $id = createdId(splitOrder());

    postJson("/api/orders/{$id}/split", ['mode' => 'thirds'])->assertStatus(422)->assertJsonValidationErrors('mode');
    postJson("/api/orders/{$id}/split", ['mode' => 'equal', 'n' => 0])->assertStatus(422)->assertJsonValidationErrors('n');
    postJson("/api/orders/{$id}/split", ['mode' => 'units', 'payers' => [['picks' => [['line_id' => 1, 'qty' => 'meio']]]]])
        ->assertStatus(422)->assertJsonValidationErrors('payers.0.picks.0.qty');
    postJson('/api/orders/999/split', ['mode' => 'equal', 'n' => 2])->assertNotFound();
});

it('stores allocations with the payment, and drops them with a removed line', function (): void {
    actAs(Role::Waitress);
    $order = splitOrder();
    $id = createdId($order);
    $half = lineId($order, 1);

    $paid = postJson("/api/orders/{$id}/payments", [
        'method' => 'pix', 'amount_cents' => 1700, 'payer_label' => 'Bia', 'allocations' => [['line_id' => $half, 'qty' => '1']],
    ])->assertCreated();
    expect($paid->json('payments.0.allocations'))->toBe([['line_id' => $half, 'qty' => '1']]);
    postJson("/api/orders/{$id}/payments", ['method' => 'pix', 'amount_cents' => 1, 'allocations' => [['line_id' => 999999, 'qty' => '1']]])
        ->assertNotFound()->assertJson(['code' => 'order.line_not_found']);

    $v = $order->json('lines.0.variant_id');
    assert(is_int($v));
    putJson("/api/orders/{$id}", dineInBody($v, ['lines' => [['id' => lineId($order), 'variant_id' => $v, 'qty' => 3]]]))->assertOk();
    expect(postJson("/api/orders/{$id}/split", ['mode' => 'equal', 'n' => 1])->json('shares.0.amount_cents'))->toBe(9600 - 1700);
});
