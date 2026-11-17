<?php

declare(strict_types=1);

use App\Application\Menu\MenuRepository;
use App\Domain\Auth\Role;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Variant;
use App\Infrastructure\Auth\EloquentUser;
use App\Infrastructure\Order\OrderUpdated;
use Carbon\CarbonImmutable;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\getJson;
use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\travelTo;

/** @return array{variant: int, half: int, addon: int} Philadelphia: Inteiro R$32, Meio R$17; add-on Cream cheese R$3 */
function orderApiMenu(): array
{
    $menu = app(MenuRepository::class);
    $category = $menu->saveCategory(new Category(0, 'Uramaki', 0, true));
    $item = $menu->saveItem(new Item(0, $category->id, 'Philadelphia', null, true, 0));

    return [
        'variant' => $menu->saveVariant(new Variant(0, $item->id, 'Inteiro', 3200, true, 0))->id,
        'half' => $menu->saveVariant(new Variant(0, $item->id, 'Meio', 1700, true, 1))->id,
        'addon' => $menu->saveAddon(new Addon(0, $item->id, null, 'Cream cheese', 300, true))->id,
    ];
}

/**
 * @param  array<string, mixed>  $body
 * @return array<string, mixed>
 */
function dineInBody(int $variant, array $body = []): array
{
    return ['type' => 'dine_in', 'customer_name' => 'Amanda', 'lines' => [['variant_id' => $variant, 'qty' => 1]], ...$body];
}

/**
 * @param  array<string, mixed>  $body
 * @return TestResponse<JsonResponse>
 */
function placeOrder(int $variant, array $body = []): TestResponse
{
    return postJson('/api/orders', dineInBody($variant, $body))->assertCreated();
}

/** @param  TestResponse<JsonResponse>  $response */
function lineId(TestResponse $response, int $index = 0): int
{
    $id = $response->json("lines.{$index}.id");
    assert(is_int($id));

    return $id;
}

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-11-16 12:00:00+00:00')));

it('creates an order and answers it in the exact shape with domain totals', function (): void {
    $user = actAs(Role::Waitress);
    ['variant' => $v, 'addon' => $a] = orderApiMenu();

    $response = postJson('/api/orders', [
        'type' => 'delivery', 'customer_name' => 'Amanda', 'address_text' => 'Rua A, 1', 'delivery_fee_cents' => 700,
        'pay_on_delivery' => true, 'pay_method' => 'cash', 'change_for_cents' => 10000, 'note' => 'portão azul',
        'lines' => [['variant_id' => $v, 'qty' => 2, 'note' => 'sem cebolinha', 'addon_ids' => [$a]]],
    ])->assertCreated();

    $response->assertExactJson([
        'id' => 1, 'type' => 'delivery', 'status' => 'open', 'customer_id' => null, 'customer_name' => 'Amanda',
        'address_text' => 'Rua A, 1', 'delivery_fee_cents' => 700, 'pay_on_delivery' => true, 'change_for_cents' => 10000,
        'pay_method' => 'cash', 'note' => 'portão azul',
        'lines' => [[
            'id' => lineId($response), 'variant_id' => $v, 'category_name' => 'Uramaki', 'item_name' => 'Philadelphia',
            'variant_name' => 'Inteiro', 'print_name' => null, 'unit_price_cents' => 3200, 'qty' => 2, 'note' => 'sem cebolinha',
            'addons' => [['addon_id' => $a, 'name' => 'Cream cheese', 'price_cents' => 300]], 'total_cents' => 7000,
        ]],
        'subtotal_cents' => 7000, 'total_cents' => 7700,
        'created_by' => $user->id, 'created_at' => '2026-11-16T12:00:00+00:00', 'closed_at' => null, 'cancel_reason' => null,
        'printed_version' => 0, 'version' => 1, 'print_status' => 'not_printed',
    ]);
    expect(lastAudit())->toMatchArray(['user_id' => $user->id, 'entity' => 'order', 'entity_id' => '1', 'action' => 'create'])
        ->and(lastAudit()['summary'])->toMatchArray(['type' => 'delivery', 'total_cents' => 7700]);
});

it('numbers orders in sequence', function (): void {
    actAs(Role::Admin);
    ['variant' => $v] = orderApiMenu();

    expect([createdId(placeOrder($v)), createdId(placeOrder($v)), createdId(placeOrder($v))])->toBe([1, 2, 3]);
});

it('lists active orders newest first, or one status', function (): void {
    ['variant' => $v] = orderApiMenu();
    actAs(Role::Waitress);
    $first = placeOrder($v)->json();
    $closed = createdId(placeOrder($v));
    $third = placeOrder($v)->json();
    putJson("/api/orders/{$closed}/status", ['status' => 'closed'])->assertOk();

    getJson('/api/orders')->assertOk()->assertExactJson(['orders' => [$third, $first]]);
    expect(getJson('/api/orders?status=closed')->assertOk()->json('orders.*.id'))->toBe([$closed])
        ->and(getJson('/api/orders?status=cancelled')->json('orders'))->toBe([]);
    getJson('/api/orders?status=paid')->assertStatus(422)->assertJsonValidationErrors('status');
});

it('shows one order, or 404 for a missing one', function (): void {
    ['variant' => $v] = orderApiMenu();
    actAs(Role::Waitress);
    $order = placeOrder($v)->json();
    assert(is_array($order));
    actAs(Role::Kitchen);

    getJson('/api/orders/1')->assertOk()->assertExactJson($order);
    getJson('/api/orders/99')->assertNotFound()->assertExactJson(['code' => 'order.not_found', 'message' => 'No order with number 99.']);
});

it('404s for ids outside the route pattern', function (string $id): void {
    actAs(Role::Waitress);

    getJson("/api/orders/{$id}")->assertNotFound()->assertJsonPath('code', 'not_found');
})->with(['abc', '1234567890123456789']);

it('edits lines and details, keeping kept lines, bumping the version and auditing the edit note', function (): void {
    $user = actAs(Role::Waitress);
    ['variant' => $v, 'half' => $h] = orderApiMenu();
    $created = placeOrder($v);
    $kept = lineId($created);

    $response = putJson('/api/orders/1', dineInBody($v, [
        'customer_name' => 'Amanda S', 'note' => 'mesa fundo', 'edit_note' => 'cliente pediu mais',
        'lines' => [['id' => $kept, 'variant_id' => $v, 'qty' => 3], ['variant_id' => $h, 'qty' => 1, 'note' => null]],
    ]))->assertOk();

    expect($response->json())->toMatchArray(['customer_name' => 'Amanda S', 'note' => 'mesa fundo', 'version' => 2, 'total_cents' => 11300])
        ->and($response->json('lines.0.id'))->toBe($kept)
        ->and($response->json('lines.*.qty'))->toBe([3, 1])
        ->and(lastAudit())->toMatchArray(['user_id' => $user->id, 'entity_id' => '1', 'action' => 'update', 'note' => 'cliente pediu mais']);
});

it('answers 404 for a line of another order', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    placeOrder($v);
    $other = lineId(placeOrder($v));

    putJson('/api/orders/1', dineInBody($v, ['lines' => [['id' => $other, 'variant_id' => $v, 'qty' => 1]]]))
        ->assertNotFound()->assertJsonPath('code', 'order.line_not_found')->assertJsonPath('line_id', $other);
    putJson('/api/orders/9', dineInBody($v))->assertNotFound()->assertJsonPath('code', 'order.not_found');
});

it('moves status forward and audits from and to, refusing other moves', function (): void {
    ['variant' => $v] = orderApiMenu();
    actAs(Role::Waitress);
    placeOrder($v);
    $user = actAs(Role::Kitchen);

    putJson('/api/orders/1/status', ['status' => 'ready', 'note' => 'saiu da cozinha'])->assertOk()
        ->assertJsonPath('status', 'ready')->assertJsonPath('version', 1);
    expect(lastAudit())->toMatchArray([
        'user_id' => $user->id, 'action' => 'status', 'summary' => ['from' => 'open', 'to' => 'ready'], 'note' => 'saiu da cozinha',
    ]);

    putJson('/api/orders/1/status', ['status' => 'out_for_delivery'])->assertStatus(422)->assertExactJson([
        'code' => 'order.invalid_transition', 'message' => 'Cannot move an order from ready to out_for_delivery.',
        'from' => 'ready', 'to' => 'out_for_delivery',
    ]);
    putJson('/api/orders/1/status', ['status' => 'closed'])->assertOk()
        ->assertJsonPath('status', 'closed')->assertJsonPath('closed_at', '2026-11-16T12:00:00+00:00');
});

it('cancels with a reason, after which the order cannot change', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    placeOrder($v);

    postJson('/api/orders/1/cancel', ['note' => 'x'])->assertStatus(422)->assertJsonValidationErrors('reason');
    postJson('/api/orders/1/cancel', ['reason' => 'cliente desistiu', 'note' => 'ligou'])->assertOk()
        ->assertJsonPath('status', 'cancelled')->assertJsonPath('cancel_reason', 'cliente desistiu')->assertJsonPath('version', 2);
    expect(lastAudit())->toMatchArray(['action' => 'cancel', 'summary' => ['reason' => 'cliente desistiu', 'version' => 2], 'note' => 'ligou']);

    putJson('/api/orders/1', dineInBody($v))->assertStatus(422)->assertJsonPath('code', 'order.cancelled');
    postJson('/api/orders/1/reopen')->assertStatus(422)->assertJsonPath('code', 'order.cancelled');
});

it('reopens a closed order with a version bump', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    placeOrder($v);
    putJson('/api/orders/1/status', ['status' => 'closed'])->assertOk();

    postJson('/api/orders/1/reopen', ['note' => 'faltou cobrar'])->assertOk()
        ->assertJsonPath('status', 'open')->assertJsonPath('closed_at', null)->assertJsonPath('version', 2);
    expect(lastAudit())->toMatchArray(['action' => 'reopen', 'summary' => ['version' => 2], 'note' => 'faltou cobrar']);
});

it('lets the kitchen read, edit, move and reopen but not take or cancel orders', function (): void {
    ['variant' => $v] = orderApiMenu();
    actAs(Role::Admin);
    placeOrder($v);
    actAs(Role::Kitchen);

    postJson('/api/orders', dineInBody($v))->assertForbidden()->assertJsonPath('code', 'forbidden');
    postJson('/api/orders/1/cancel', ['reason' => 'x'])->assertForbidden();
    getJson('/api/orders')->assertOk();
    putJson('/api/orders/1', dineInBody($v))->assertOk();
    putJson('/api/orders/1/status', ['status' => 'closed'])->assertOk();
    postJson('/api/orders/1/reopen')->assertOk();
    expect(DB::table('orders')->count())->toBe(1)->and(DB::table('orders')->value('status'))->toBe('open');
});

it('requires a session', function (string $method, string $uri): void {
    json($method, $uri)->assertUnauthorized()->assertExactJson(['code' => 'unauthenticated', 'message' => 'Unauthenticated.']);
})->with([
    ['GET', '/api/orders'], ['GET', '/api/orders/1'], ['POST', '/api/orders'], ['PUT', '/api/orders/1'],
    ['PUT', '/api/orders/1/status'], ['POST', '/api/orders/1/cancel'], ['POST', '/api/orders/1/reopen'],
    ['GET', '/api/orders/1/ticket'], ['POST', '/api/orders/1/printed'], ['POST', '/api/broadcasting/auth'],
]);

it('validates the order body', function (array $body, string $field): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();

    postJson('/api/orders', array_replace_recursive(dineInBody($v), $body))->assertStatus(422)
        ->assertJsonPath('code', 'validation')->assertJsonValidationErrors($field);
    expect(DB::table('orders')->count())->toBe(0);
})->with([
    'unknown type' => [['type' => 'table'], 'type'],
    'no name' => [['customer_name' => ''], 'customer_name'],
    'long name' => [['customer_name' => str_repeat('a', 256)], 'customer_name'],
    'negative fee' => [['delivery_fee_cents' => -1], 'delivery_fee_cents'],
    'fractional fee' => [['delivery_fee_cents' => 1.5], 'delivery_fee_cents'],
    'huge change' => [['change_for_cents' => 100000001], 'change_for_cents'],
    'pay on delivery not bool' => [['pay_on_delivery' => 'maybe'], 'pay_on_delivery'],
    'unknown pay method' => [['pay_on_delivery' => true, 'pay_method' => 'cheque'], 'pay_method'],
    'no lines' => [['lines' => 'x'], 'lines'],
    'zero qty' => [['lines' => [['qty' => 0]]], 'lines.0.qty'],
    'huge qty' => [['lines' => [['qty' => 1000]]], 'lines.0.qty'],
    'variant not int' => [['lines' => [['variant_id' => 'abc']]], 'lines.0.variant_id'],
    'add-ons not a list' => [['lines' => [['addon_ids' => ['a' => 1]]]], 'lines.0.addon_ids'],
    'add-on id not int' => [['lines' => [['addon_ids' => ['x']]]], 'lines.0.addon_ids.0'],
    'unknown line key' => [['lines' => [['price_cents' => 1]]], 'lines.0'],
    'line id on create' => [['lines' => [['id' => 5]]], 'lines.0.id'],
    'edit note on create' => [['edit_note' => 'x'], 'edit_note'],
]);

it('rejects an empty line list and an unknown status', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();

    postJson('/api/orders', [...dineInBody($v), 'lines' => []])->assertStatus(422)->assertJsonValidationErrors('lines');
    placeOrder($v);
    putJson('/api/orders/1/status', ['status' => 'paid'])->assertStatus(422)->assertJsonValidationErrors('status');
});

it('answers domain rule violations with their code', function (array $body, int $status, string $code): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();

    postJson('/api/orders', array_replace(dineInBody($v), $body))->assertStatus($status)->assertJsonPath('code', $code);
    expect(DB::table('orders')->count())->toBe(0);
})->with([
    'delivery without address' => [['type' => 'delivery'], 422, 'order.address_required'],
    'fee on dine-in' => [['delivery_fee_cents' => 500], 422, 'order.invalid_delivery_fee'],
    'pay on delivery without method' => [['pay_on_delivery' => true], 422, 'order.invalid_pay_method'],
    'change for on card' => [['pay_on_delivery' => true, 'pay_method' => 'credit', 'change_for_cents' => 5000], 422, 'order.invalid_pay_method'],
    'missing variant' => [['lines' => [['variant_id' => 999999, 'qty' => 1]]], 404, 'menu.not_found'],
]);

describe('realtime', function (): void {
    it('broadcasts id and version after each committed change, and nothing on a refused one', function (): void {
        Event::fake([OrderUpdated::class]);
        actAs(Role::Waitress);
        ['variant' => $v] = orderApiMenu();

        placeOrder($v);
        putJson('/api/orders/1', dineInBody($v))->assertOk();
        putJson('/api/orders/1/status', ['status' => 'out_for_delivery'])->assertStatus(422);
        putJson('/api/orders/1/status', ['status' => 'closed'])->assertOk();
        postJson('/api/orders/1/reopen')->assertOk();
        postJson('/api/orders/1/cancel', ['reason' => 'engano'])->assertOk();

        $sent = [];
        Event::assertDispatched(OrderUpdated::class, function (OrderUpdated $e) use (&$sent): bool {
            $sent[] = [$e->id, $e->version];

            return true;
        });
        expect($sent)->toBe([[1, 1], [1, 2], [1, 2], [1, 3], [1, 4]]);
    });

    it('sends order.updated on the private orders channel with only id and version', function (): void {
        $event = new OrderUpdated(7, 3);

        expect($event->broadcastOn()->name)->toBe('private-orders')
            ->and($event->broadcastAs())->toBe('order.updated')
            ->and($event->broadcastWith())->toBe(['id' => 7, 'version' => 3]);
    });

    it('keeps the change when Reverb is unreachable', function (): void {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'key', 'broadcasting.connections.reverb.secret' => 'secret',
            'broadcasting.connections.reverb.app_id' => '1',
            'broadcasting.connections.reverb.options' => ['host' => '127.0.0.1', 'port' => 1, 'scheme' => 'http', 'useTLS' => false],
        ]);
        Exceptions::fake();
        actAs(Role::Waitress);
        ['variant' => $v] = orderApiMenu();

        placeOrder($v);

        expect(DB::table('orders')->count())->toBe(1);
        Exceptions::assertReported(BroadcastException::class);
    });

    describe('channel auth', function (): void {
        beforeEach(function (): void {
            // The null test broadcaster authorizes everything; use the Reverb one and register the channels on it.
            config([
                'broadcasting.default' => 'reverb',
                'broadcasting.connections.reverb.key' => 'key', 'broadcasting.connections.reverb.secret' => 'secret',
                'broadcasting.connections.reverb.app_id' => '1',
            ]);
            require base_path('routes/channels.php');
        });

        it('authorizes logged-in staff on the orders channel', function (Role $role): void {
            actAs($role);

            $auth = postJson('/api/broadcasting/auth', ['channel_name' => 'private-orders', 'socket_id' => '1234.5678'])
                ->assertOk()->json('auth');

            expect($auth)->toStartWith('key:');
        })->with([Role::Admin, Role::Waitress, Role::Kitchen]);

        it('refuses other channels and guests', function (): void {
            postJson('/api/broadcasting/auth', ['channel_name' => 'private-orders', 'socket_id' => '1234.5678'])->assertUnauthorized();

            actAs(Role::Waitress);
            postJson('/api/broadcasting/auth', ['channel_name' => 'private-other', 'socket_id' => '1234.5678'])->assertForbidden();
        });

        it('refuses a deactivated user', function (): void {
            $user = actAs(Role::Waitress);
            EloquentUser::query()->whereKey($user->id)->update(['active' => false]);
            $user->refresh();

            postJson('/api/broadcasting/auth', ['channel_name' => 'private-orders', 'socket_id' => '1234.5678'])->assertForbidden();
        });
    });
});

it('answers the kitchen ticket in the exact shape, without line prices', function (): void {
    ['variant' => $v, 'addon' => $a] = orderApiMenu();
    actAs(Role::Waitress);
    $id = createdId(placeOrder($v, ['note' => 'mesa da janela', 'lines' => [['variant_id' => $v, 'qty' => 2, 'note' => 'sem cebolinha', 'addon_ids' => [$a]]]]));
    actAs(Role::Kitchen);

    getJson("/api/orders/{$id}/ticket?kind=kitchen")->assertOk()->assertExactJson([
        'kind' => 'kitchen', 'number' => $id, 'type' => 'dine_in', 'customer_name' => 'Amanda', 'address_text' => null,
        'created_at' => '2026-11-16T12:00:00+00:00', 'version' => 1, 'updated_version' => null,
        'cancelled' => false, 'cancel_reason' => null, 'note' => 'mesa da janela',
        'lines' => [[
            'qty' => 2, 'category_name' => 'Uramaki', 'item_name' => 'Philadelphia', 'variant_name' => 'Inteiro', 'print_name' => null,
            'addons' => ['Cream cheese'], 'note' => 'sem cebolinha',
        ]],
        'subtotal_cents' => 7000, 'delivery_fee_cents' => 0, 'total_cents' => 7000,
        'pay_on_delivery' => false, 'pay_method' => null, 'change_for_cents' => null, 'change_cents' => null,
    ]);
});

it('answers the bill in the exact shape, with totals and the change to take', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    $created = postJson('/api/orders', [
        'type' => 'delivery', 'customer_name' => 'Ana', 'address_text' => 'Rua A, 1', 'delivery_fee_cents' => 700,
        'pay_on_delivery' => true, 'pay_method' => 'cash', 'change_for_cents' => 5000,
        'lines' => [['variant_id' => $v, 'qty' => 1]],
    ])->assertCreated();
    $id = createdId($created);

    getJson("/api/orders/{$id}/ticket?kind=bill")->assertOk()->assertExactJson([
        'kind' => 'bill', 'number' => $id, 'type' => 'delivery', 'customer_name' => 'Ana', 'address_text' => 'Rua A, 1',
        'created_at' => '2026-11-16T12:00:00+00:00', 'version' => 1, 'cancelled' => false, 'note' => null,
        'lines' => $created->json('lines'),
        'subtotal_cents' => 3200, 'delivery_fee_cents' => 700, 'total_cents' => 3900,
        'pay_on_delivery' => true, 'pay_method' => 'cash', 'change_for_cents' => 5000, 'change_cents' => 1100,
    ]);
});

it('validates the ticket kind and answers 404 for a missing order', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    $id = createdId(placeOrder($v));

    getJson("/api/orders/{$id}/ticket")->assertStatus(422)->assertJsonValidationErrors('kind');
    getJson("/api/orders/{$id}/ticket?kind=receipt")->assertStatus(422)->assertJsonValidationErrors('kind');
    getJson('/api/orders/999/ticket?kind=bill')->assertNotFound()->assertJson(['code' => 'order.not_found']);
});

it('records a kitchen print, clearing the badge until the next change, which prints as updated', function (): void {
    Event::fake([OrderUpdated::class]);
    ['variant' => $v] = orderApiMenu();
    actAs(Role::Waitress);
    $id = createdId(placeOrder($v));
    $printer = actAs(Role::Kitchen);

    postJson("/api/orders/{$id}/printed", ['kind' => 'kitchen', 'version' => 1, 'note' => 'impressora 1'])->assertOk()
        ->assertJson(['printed_version' => 1, 'print_status' => null]);
    expect(lastAudit())->toMatchArray(['user_id' => $printer->id, 'entity' => 'order', 'entity_id' => (string) $id, 'action' => 'print', 'note' => 'impressora 1'])
        ->and(lastAudit()['summary'])->toBe(['kind' => 'kitchen', 'version' => 1]);
    Event::assertDispatched(OrderUpdated::class);

    actAs(Role::Waitress);
    putJson("/api/orders/{$id}", dineInBody($v, ['note' => 'sem wasabi']))->assertOk()->assertJson(['print_status' => 'changed']);
    expect(getJson("/api/orders/{$id}/ticket?kind=kitchen")->json('updated_version'))->toBe(2);
});

it('records a bill print without clearing the kitchen badge', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    $id = createdId(placeOrder($v));

    postJson("/api/orders/{$id}/printed", ['kind' => 'bill', 'version' => 1])->assertOk()
        ->assertJson(['printed_version' => 0, 'print_status' => 'not_printed']);
    expect(lastAudit()['summary'])->toBe(['kind' => 'bill', 'version' => 1]);
});

it('validates a print and refuses a version the order never had', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    $id = createdId(placeOrder($v));

    postJson("/api/orders/{$id}/printed", ['kind' => 'menu', 'version' => 'x'])->assertStatus(422)->assertJsonValidationErrors(['kind', 'version']);
    postJson("/api/orders/{$id}/printed", ['kind' => 'kitchen', 'version' => 2])->assertStatus(422)->assertJson(['code' => 'order.invalid_print_version']);
    postJson('/api/orders/999/printed', ['kind' => 'kitchen', 'version' => 1])->assertNotFound();
});

it('lets a cancelled order print its cancel ticket', function (): void {
    actAs(Role::Waitress);
    ['variant' => $v] = orderApiMenu();
    $id = createdId(placeOrder($v));
    postJson("/api/orders/{$id}/printed", ['kind' => 'kitchen', 'version' => 1])->assertOk();
    postJson("/api/orders/{$id}/cancel", ['reason' => 'desistiu'])->assertOk()->assertJson(['print_status' => 'cancel_not_printed']);

    getJson("/api/orders/{$id}/ticket?kind=kitchen")->assertOk()->assertJson(['cancelled' => true, 'cancel_reason' => 'desistiu', 'updated_version' => 2]);
    postJson("/api/orders/{$id}/printed", ['kind' => 'kitchen', 'version' => 2])->assertOk()->assertJson(['print_status' => null]);
});

it('snapshots the variant print name on the line and prints it on both tickets', function (): void {
    actAs(Role::Admin);
    ['variant' => $v] = orderApiMenu();
    putJson("/api/variants/{$v}", ['name' => 'Inteiro', 'price_cents' => 3200, 'sort' => 0, 'print_name' => 'Phila lata'])->assertOk();
    $id = createdId(placeOrder($v));
    putJson("/api/variants/{$v}", ['name' => 'Inteiro', 'price_cents' => 3200, 'sort' => 0, 'print_name' => 'Outro'])->assertOk();

    expect(getJson("/api/orders/{$id}/ticket?kind=kitchen")->json('lines.0.print_name'))->toBe('Phila lata')
        ->and(getJson("/api/orders/{$id}/ticket?kind=bill")->json('lines.0.print_name'))->toBe('Phila lata');
});
