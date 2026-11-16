<?php

declare(strict_types=1);

use App\Application\Menu\MenuRepository;
use App\Application\Order\OrderRepository;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Variant;
use App\Domain\Order\LineAddon;
use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Support\Facades\DB;

/** @return array{OrderRepository, Order} an unsaved delivery order with one line and one add-on */
function orderRepoWithDraft(): array
{
    $menu = app(MenuRepository::class);
    $category = $menu->saveCategory(new Category(0, 'Uramaki', 0, true));
    $item = $menu->saveItem(new Item(0, $category->id, 'Philadelphia', null, true, 0));
    $variant = $menu->saveVariant(new Variant(0, $item->id, 'Inteiro', 3200, true, 0));
    $addon = $menu->saveAddon(new Addon(0, $item->id, null, 'Cream cheese', 300, true));
    $user = EloquentUser::factory()->create();
    $repo = app(OrderRepository::class);

    $order = Order::place($repo->nextNumber(), new OrderDetails(
        OrderType::Delivery, 'Amanda', null, 'Rua A, 1', 700, true, 10000, 'portão azul',
    ), [new OrderLine(0, $variant->id, 'Philadelphia', 'Inteiro', 3200, 2, 'sem cebolinha', [new LineAddon($addon->id, 'Cream cheese', 300)])],
        $user->id, new DateTimeImmutable('2026-11-16 12:00:00+00:00'));

    return [$repo, $order];
}

it('starts order numbers at 1 and never repeats them', function (): void {
    $repo = app(OrderRepository::class);

    expect([$repo->nextNumber(), $repo->nextNumber(), $repo->nextNumber()])->toBe([1, 2, 3]);
});

it('leaves no gap when the transaction taking a number rolls back', function (): void {
    $repo = app(OrderRepository::class);
    $first = $repo->nextNumber();

    try {
        DB::transaction(function () use ($repo): void {
            $repo->nextNumber();
            throw new RuntimeException('order failed');
        });
    } catch (RuntimeException) {
    }

    expect($repo->nextNumber())->toBe($first + 1);
});

it('stores and reads back an order with lines and add-on snapshots', function (): void {
    [$repo, $draft] = orderRepoWithDraft();

    $order = $repo->save($draft);
    $line = $order->lines[0];

    expect($order->id)->toBe($draft->id)
        ->and($line->id)->toBeGreaterThan(0)
        ->and($order)->toEqual(new Order(
            $draft->id, $draft->details, OrderStatus::Open,
            [new OrderLine($line->id, $line->variantId, 'Philadelphia', 'Inteiro', 3200, 2, 'sem cebolinha', $draft->lines[0]->addons)],
            $draft->createdBy, new DateTimeImmutable('2026-11-16 12:00:00+00:00'),
        ))
        ->and($repo->find($order->id))->toEqual($order)
        ->and($repo->find(999999))->toBeNull()
        ->and($order->totalCents())->toBe(2 * 3500 + 700);
});

it('updates status and version, keeps kept line ids, adds new lines and removes dropped ones', function (): void {
    [$repo, $draft] = orderRepoWithDraft();
    $order = $repo->save($draft);
    $kept = $order->lines[0];
    $order->edit($order->details, [
        new OrderLine($kept->id, $kept->variantId, $kept->itemName, $kept->variantName, $kept->unitPriceCents, 5, null, []),
        new OrderLine(0, $kept->variantId, 'Philadelphia', 'Inteiro', 3300, 1, null),
    ]);
    $order->cancel('engano');

    $saved = $repo->save($order);
    $again = $repo->save($repo->lock($order->id) ?? throw new LogicException);

    expect($saved->status)->toBe(OrderStatus::Cancelled)
        ->and($saved->cancelReason)->toBe('engano')
        ->and($saved->version)->toBe(3)
        ->and(array_map(fn (OrderLine $l) => [$l->qty, $l->addons], $saved->lines))->toBe([[5, []], [1, []]])
        ->and($saved->lines[0]->id)->toBe($kept->id)
        ->and($again)->toEqual($saved)
        ->and(DB::table('line_addons')->count())->toBe(0);
});

it('stores closed_at as a timestamptz', function (): void {
    [$repo, $draft] = orderRepoWithDraft();
    $draft->moveTo(OrderStatus::Closed, new DateTimeImmutable('2026-11-16 15:30:00-03:00'));

    expect($repo->save($draft)->closedAt?->getTimestamp())->toBe((new DateTimeImmutable('2026-11-16 18:30:00+00:00'))->getTimestamp());
});
