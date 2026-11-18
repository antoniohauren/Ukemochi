<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\travelTo;

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-11-16 12:00:00+00:00')));

it('opens a shift and answers it in the exact shape', function (): void {
    $user = actAs(Role::Waitress);
    getJson('/api/shifts/current')->assertOk()->assertExactJson(['shift' => null]);

    $response = postJson('/api/shifts', ['opening_float_cents' => 10000, 'note' => 'cofre'])->assertCreated();
    $shift = $response->assertExactJson([
        'id' => createdId($response), 'opened_by' => $user->id, 'opened_at' => '2026-11-16T12:00:00+00:00', 'opening_float_cents' => 10000,
        'closed_by' => null, 'closed_at' => null, 'counted_cents' => null, 'note' => 'cofre', 'movements' => [],
        'totals_by_method' => ['cash' => 0, 'credit' => 0, 'debit' => 0, 'pix' => 0],
        'withdrawals_cents' => 0, 'staff_meals_cents' => 0, 'deposits_cents' => 0, 'expected_cents' => 10000, 'difference_cents' => null,
    ])->json();

    getJson('/api/shifts/current')->assertOk()->assertExactJson(['shift' => $shift]);
    expect(lastAudit())->toMatchArray(['user_id' => $user->id, 'entity' => 'shift', 'entity_id' => (string) createdId($response), 'action' => 'open', 'note' => 'cofre']);
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertStatus(409)->assertJson(['code' => 'cash.shift_already_open']);
});

it('records movements, staff meal with the staff name', function (): void {
    $user = actAs(Role::Admin);
    postJson('/api/shifts/current/movements', ['kind' => 'deposit', 'amount_cents' => 100])->assertStatus(409)->assertJson(['code' => 'cash.no_open_shift']);
    postJson('/api/shifts', ['opening_float_cents' => 10000])->assertCreated();

    $response = postJson('/api/shifts/current/movements', ['kind' => 'staff_meal', 'amount_cents' => 2200, 'staff_name' => 'Amanda', 'note' => 'almoço'])
        ->assertCreated();

    expect($response->json('movements'))->toBe([[
        'id' => $response->json('movements.0.id'), 'kind' => 'staff_meal', 'amount_cents' => 2200, 'staff_name' => 'Amanda', 'note' => 'almoço',
        'created_by' => $user->id, 'created_at' => '2026-11-16T12:00:00+00:00',
    ]])->and($response->json('expected_cents'))->toBe(7800)
        ->and(lastAudit())->toMatchArray(['entity' => 'shift', 'action' => 'movement', 'note' => 'almoço']);
    postJson('/api/shifts/current/movements', ['kind' => 'withdrawal', 'amount_cents' => 5000, 'staff_name' => 'Amanda'])
        ->assertCreated()->assertJsonPath('movements.1.staff_name', null)->assertJsonPath('expected_cents', 2800);
});

it('validates movements and shifts', function (): void {
    actAs(Role::Admin);
    postJson('/api/shifts', ['opening_float_cents' => -1])->assertStatus(422)->assertJsonValidationErrors('opening_float_cents');
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated();
    postJson('/api/shifts/current/movements', ['kind' => 'staff_meal', 'amount_cents' => 0])
        ->assertStatus(422)->assertJsonValidationErrors(['amount_cents', 'staff_name']);
    postJson('/api/shifts/current/movements', ['kind' => 'tip', 'amount_cents' => 1])->assertStatus(422)->assertJsonValidationErrors('kind');
    postJson('/api/shifts/current/close', [])->assertStatus(422)->assertJsonValidationErrors('counted_cents');
});

it('closes with the difference, then lists and shows past shifts to admins', function (): void {
    $user = actAs(Role::Admin);
    postJson('/api/shifts', ['opening_float_cents' => 10000])->assertCreated();
    postJson('/api/shifts/current/movements', ['kind' => 'withdrawal', 'amount_cents' => 3000])->assertCreated();

    travelTo(CarbonImmutable::parse('2026-11-16 23:00:00+00:00'));
    $closing = postJson('/api/shifts/current/close', ['counted_cents' => 6500, 'note' => 'faltou'])->assertOk();
    $closed = $closing->assertJson(['closed_by' => $user->id, 'closed_at' => '2026-11-16T23:00:00+00:00', 'counted_cents' => 6500, 'note' => 'faltou',
        'expected_cents' => 7000, 'difference_cents' => -500])->json();

    // The shift-close backup audits after the close.
    $close = DB::table('audit_log')->where('action', 'close')->sole();
    expect(json_decode(is_string($close->summary) ? $close->summary : '', true))->toBe(['counted_cents' => 6500, 'expected_cents' => 7000, 'difference_cents' => -500]);
    getJson('/api/shifts/current')->assertExactJson(['shift' => null]);
    postJson('/api/shifts/current/close', ['counted_cents' => 0])->assertStatus(409)->assertJson(['code' => 'cash.no_open_shift']);
    $second = postJson('/api/shifts', ['opening_float_cents' => 0])->assertCreated()->json();
    getJson('/api/shifts')->assertOk()->assertExactJson(['shifts' => [$second, $closed]]);
    expect(getJson('/api/shifts/'.createdId($closing))->assertOk()->json())->toBe($closed);
    getJson('/api/shifts/99')->assertNotFound()->assertJson(['code' => 'cash.shift_not_found']);
});

it('lets kitchen see the current shift only, and keeps past shifts for admins', function (): void {
    actAs(Role::Kitchen);
    getJson('/api/shifts/current')->assertOk();
    postJson('/api/shifts', ['opening_float_cents' => 0])->assertForbidden();
    actAs(Role::Waitress);
    getJson('/api/shifts')->assertForbidden();
});
