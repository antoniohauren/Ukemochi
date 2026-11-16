<?php

declare(strict_types=1);

use App\Application\Order\LineInput;
use App\Application\Order\ManageOrders;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Menu\Variant;
use App\Domain\Order\AddonNotAllowed;
use App\Domain\Order\CancelReasonRequired;
use App\Domain\Order\InvalidTransition;
use App\Domain\Order\LineAddon;
use App\Domain\Order\LineNotFound;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderNotFound;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use Tests\Fakes\FixedClock;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryMenuRepository;
use Tests\Fakes\InMemoryOrderEvents;
use Tests\Fakes\InMemoryOrderRepository;
use Tests\Fakes\InMemorySessionAuth;

/**
 * Menu: category 1 > item 10 "Philadelphia" > variant 100 "Inteiro" R$32; add-on 1000 on the item (R$3),
 * add-on 1001 on the category (R$1.50), add-on 1002 on another item, add-on 1003 inactive.
 *
 * @return array{ManageOrders, InMemoryOrderRepository, InMemoryAuditLog, InMemoryMenuRepository, InMemorySessionAuth, InMemoryOrderEvents}
 */
function manageOrders(): array
{
    $menu = new InMemoryMenuRepository;
    $menu->categories[1] = new Category(1, 'Uramaki', 0, true);
    $menu->items[10] = new Item(10, 1, 'Philadelphia', null, true, 0);
    $menu->items[11] = new Item(11, 2, 'Coca', null, true, 0);
    $menu->variants[100] = new Variant(100, 10, 'Inteiro', 3200, true, 0);
    $menu->variants[101] = new Variant(101, 10, 'Meio', 1700, true, 1);
    $menu->addons[1000] = new Addon(1000, 10, null, 'Cream cheese', 300, true);
    $menu->addons[1001] = new Addon(1001, null, 1, 'Gergelim', 150, true);
    $menu->addons[1002] = new Addon(1002, 11, null, 'Gelo', 0, true);
    $menu->addons[1003] = new Addon(1003, 10, null, 'Tarê', 100, false);
    $orders = new InMemoryOrderRepository;
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(7);

    $events = new InMemoryOrderEvents;

    return [new ManageOrders($orders, $menu, new ImmediateTransaction, $audit, $session, new FixedClock, $events), $orders, $audit, $menu, $session, $events];
}

function dineIn(?string $note = null): OrderDetails
{
    return new OrderDetails(OrderType::DineIn, 'Amanda', note: $note);
}

it('creates an order with the next number, snapshotting names and prices', function (): void {
    [$manage, $orders, $audit] = manageOrders();
    $orders->counter = 41;

    $order = $manage->create(dineIn(), [new LineInput(100, 2, 'sem cebolinha', [1000, 1001, 1000])]);

    expect($order->id)->toBe(42)
        ->and($order->createdBy)->toBe(7)
        ->and($order->createdAt)->toEqual(new DateTimeImmutable('2026-11-16 12:00:00+00:00'))
        ->and($order->lines)->toEqual([new OrderLine(1, 100, 'Philadelphia', 'Inteiro', 3200, 2, 'sem cebolinha', [
            new LineAddon(1000, 'Cream cheese', 300), new LineAddon(1001, 'Gergelim', 150),
        ])])
        ->and($order->totalCents())->toBe(7300)
        ->and($orders->orders)->toHaveKey(42)
        ->and($audit->entries)->toBe([[
            'userId' => 7, 'entity' => 'order', 'entityId' => 42, 'action' => 'create',
            'summary' => [
                'type' => 'dine_in', 'status' => 'open', 'customer_name' => 'Amanda', 'address_text' => null,
                'delivery_fee_cents' => 0, 'note' => null, 'version' => 1, 'total_cents' => 7300,
                'lines' => [[
                    'item_name' => 'Philadelphia', 'variant_name' => 'Inteiro', 'qty' => 2, 'unit_price_cents' => 3200,
                    'note' => 'sem cebolinha', 'addons' => ['Cream cheese', 'Gergelim'],
                ]],
            ],
            'note' => null,
        ]]);
});

it('takes no number when the lines are invalid', function (LineInput $line, string $error): void {
    [$manage, $orders] = manageOrders();

    expect(fn () => $manage->create(dineIn(), [$line]))->toThrow($error)
        ->and($orders->counter)->toBe(0);
})->with([
    'missing variant' => [new LineInput(999, 1), MenuNotFound::class],
    'missing add-on' => [new LineInput(100, 1, null, [999]), MenuNotFound::class],
    'add-on of another item' => [new LineInput(100, 1, null, [1002]), AddonNotAllowed::class],
    'inactive add-on' => [new LineInput(100, 1, null, [1003]), AddonNotAllowed::class],
]);

it('refuses to create without a session user', function (): void {
    [$manage, , , , $session] = manageOrders();
    $session->logout();

    $manage->create(dineIn(), [new LineInput(100, 1)]);
})->throws(NotAuthenticated::class);

it('keeps the price snapshot of kept lines when the menu price changed', function (): void {
    [$manage, $orders, $audit, $menu] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1, null, [1000]), new LineInput(101, 1)]);
    $menu->variants[100] = new Variant(100, 10, 'Inteiro 8un', 3500, true, 0);
    $menu->addons[1000] = new Addon(1000, 10, null, 'Cream cheese', 400, true);
    $menu->addons[1001] = new Addon(1001, null, 1, 'Gergelim', 200, true);

    $edited = $manage->edit($order->id, dineIn('mesa da janela'), [
        new LineInput(100, 3, 'bem passado', [1000, 1001], lineId: 1),
        new LineInput(100, 1),
    ], 'cliente pediu mais');

    expect($edited->lines)->toEqual([
        new OrderLine(1, 100, 'Philadelphia', 'Inteiro', 3200, 3, 'bem passado', [
            new LineAddon(1000, 'Cream cheese', 300), new LineAddon(1001, 'Gergelim', 200),
        ]),
        new OrderLine(3, 100, 'Philadelphia', 'Inteiro 8un', 3500, 1, null),
    ])
        ->and($edited->version)->toBe(2)
        ->and($edited->details->note)->toBe('mesa da janela')
        ->and($orders->locked)->toBe([$order->id])
        ->and($audit->entries[1])->toMatchArray(['entity' => 'order', 'entityId' => $order->id, 'action' => 'update', 'note' => 'cliente pediu mais'])
        ->and($audit->entries[1]['summary'])->toMatchArray(['version' => 2, 'total_cents' => 3 * 3700 + 3500]);
});

it('re-snapshots a kept line whose variant changed', function (): void {
    [$manage] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    $edited = $manage->edit($order->id, dineIn(), [new LineInput(101, 2, lineId: 1)], null);

    expect($edited->lines)->toEqual([new OrderLine(1, 101, 'Philadelphia', 'Meio', 1700, 2, null)]);
});

it('refuses an edit naming a line of another order or the same line twice', function (array $lines): void {
    /** @var list<LineInput> $lines */
    [$manage] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    expect(fn () => $manage->edit($order->id, dineIn(), $lines, null))->toThrow(LineNotFound::class);
})->with([
    'unknown line' => [[new LineInput(100, 1, lineId: 99)]],
    'same line twice' => [[new LineInput(100, 1, lineId: 1), new LineInput(100, 2, lineId: 1)]],
]);

it('reopens a closed order when edited', function (): void {
    [$manage] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);
    $manage->changeStatus($order->id, OrderStatus::Closed, null);

    $edited = $manage->edit($order->id, dineIn(), [new LineInput(100, 2, lineId: 1)], null);

    expect($edited->status)->toBe(OrderStatus::Open)->and($edited->version)->toBe(2);
});

it('changes status and audits from and to', function (): void {
    [$manage, , $audit] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    $ready = $manage->changeStatus($order->id, OrderStatus::Ready, 'saiu da cozinha');

    expect($ready->status)->toBe(OrderStatus::Ready)
        ->and($audit->entries[1])->toBe([
            'userId' => 7, 'entity' => 'order', 'entityId' => $order->id, 'action' => 'status',
            'summary' => ['from' => 'open', 'to' => 'ready'], 'note' => 'saiu da cozinha',
        ]);
});

it('stamps closed_at from the clock on close', function (): void {
    [$manage] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    expect($manage->changeStatus($order->id, OrderStatus::Closed, null)->closedAt)->toEqual(new DateTimeImmutable('2026-11-16 12:00:00+00:00'));
});

it('refuses an invalid move and writes nothing', function (): void {
    [$manage, , $audit] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    expect(fn () => $manage->changeStatus($order->id, OrderStatus::OutForDelivery, null))->toThrow(InvalidTransition::class)
        ->and($audit->entries)->toHaveCount(1);
});

it('cancels with a reason and audits it', function (): void {
    [$manage, , $audit] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    $cancelled = $manage->cancel($order->id, 'cliente desistiu', null);

    expect($cancelled->status)->toBe(OrderStatus::Cancelled)
        ->and($audit->entries[1])->toMatchArray(['action' => 'cancel', 'summary' => ['reason' => 'cliente desistiu', 'version' => 2]]);
});

it('refuses to cancel without a reason', function (): void {
    [$manage] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    $manage->cancel($order->id, '', null);
})->throws(CancelReasonRequired::class);

it('reopens a closed order with a version bump', function (): void {
    [$manage, , $audit] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);
    $manage->changeStatus($order->id, OrderStatus::Closed, null);

    $reopened = $manage->reopen($order->id, 'faltou cobrar');

    expect($reopened->status)->toBe(OrderStatus::Open)
        ->and($reopened->version)->toBe(2)
        ->and($audit->entries[2])->toMatchArray(['action' => 'reopen', 'summary' => ['version' => 2], 'note' => 'faltou cobrar']);
});

it('reports a missing order', function (Closure $call): void {
    [$manage] = manageOrders();

    expect(fn () => $call($manage))->toThrow(OrderNotFound::class);
})->with([
    'edit' => [fn (ManageOrders $m) => $m->edit(5, dineIn(), [new LineInput(100, 1)], null)],
    'status' => [fn (ManageOrders $m) => $m->changeStatus(5, OrderStatus::Ready, null)],
    'cancel' => [fn (ManageOrders $m) => $m->cancel(5, 'x', null)],
    'reopen' => [fn (ManageOrders $m) => $m->reopen(5, null)],
]);

it('refuses to change an order without a session user, writing nothing', function (Closure $call): void {
    [$manage, $orders, $audit, , $session] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);
    $manage->changeStatus($order->id, OrderStatus::Closed, null);
    $before = $orders->find($order->id);
    $session->logout();

    expect(fn () => $call($manage, $order->id))->toThrow(NotAuthenticated::class)
        ->and($audit->entries)->toHaveCount(2)
        ->and($orders->find($order->id))->toEqual($before);
})->with([
    'edit' => [fn (ManageOrders $m, int $id) => $m->edit($id, dineIn('x'), [new LineInput(100, 2, lineId: 1)], null)],
    'status' => [fn (ManageOrders $m, int $id) => $m->changeStatus($id, OrderStatus::Ready, null)],
    'cancel' => [fn (ManageOrders $m, int $id) => $m->cancel($id, 'x', null)],
    'reopen' => [fn (ManageOrders $m, int $id) => $m->reopen($id, null)],
]);

it('announces each change with the order id and version', function (): void {
    [$manage, , , , , $events] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);
    $manage->changeStatus($order->id, OrderStatus::Closed, null);
    $manage->edit($order->id, dineIn('x'), [new LineInput(100, 2, lineId: 1)], null);
    $manage->cancel($order->id, 'cliente desistiu', null);

    expect($events->updated)->toBe([
        ['id' => 1, 'version' => 1], ['id' => 1, 'version' => 1], ['id' => 1, 'version' => 2], ['id' => 1, 'version' => 3],
    ]);
});

it('announces nothing when a change fails', function (): void {
    [$manage, , , , , $events] = manageOrders();
    $order = $manage->create(dineIn(), [new LineInput(100, 1)]);

    expect(fn () => $manage->changeStatus($order->id, OrderStatus::OutForDelivery, null))->toThrow(InvalidTransition::class)
        ->and(fn () => $manage->create(dineIn(), [new LineInput(999, 1)]))->toThrow(MenuNotFound::class)
        ->and($events->updated)->toHaveCount(1);
});
