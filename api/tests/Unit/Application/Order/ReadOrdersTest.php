<?php

declare(strict_types=1);

use App\Application\Order\ReadOrders;
use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderNotFound;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Ticket\Bill;
use App\Domain\Ticket\KitchenTicket;
use App\Domain\Ticket\TicketKind;
use Tests\Fakes\InMemoryOrderRepository;

function storedOrder(InMemoryOrderRepository $repo, int $id, OrderStatus $status): void
{
    $repo->orders[$id] = new Order(
        $id, new OrderDetails(OrderType::DineIn, 'Amanda'), $status,
        [new OrderLine(1, 100, 'Philadelphia', 'Inteiro', 3200, 1, null)], 7, new DateTimeImmutable('2026-11-16 12:00:00+00:00'),
    );
}

/** @param  list<Order>  $orders
 * @return list<int> */
function orderIds(array $orders): array
{
    return array_map(fn (Order $o) => $o->id, $orders);
}

it('lists active orders newest first by default', function (): void {
    $repo = new InMemoryOrderRepository;
    foreach ([OrderStatus::Open, OrderStatus::Closed, OrderStatus::Ready, OrderStatus::Cancelled, OrderStatus::OutForDelivery] as $i => $status) {
        storedOrder($repo, $i + 1, $status);
    }

    expect(orderIds((new ReadOrders($repo))->list(null)))->toBe([5, 3, 1]);
});

it('lists one status, newest first and capped', function (): void {
    $repo = new InMemoryOrderRepository;
    foreach (range(1, ReadOrders::LIMIT + 2) as $id) {
        storedOrder($repo, $id, OrderStatus::Closed);
    }
    storedOrder($repo, 500, OrderStatus::Open);

    $closed = orderIds((new ReadOrders($repo))->list(OrderStatus::Closed));

    expect($closed)->toHaveCount(ReadOrders::LIMIT)->and($closed[0])->toBe(ReadOrders::LIMIT + 2);
});

it('gets one order or reports it missing', function (): void {
    $repo = new InMemoryOrderRepository;
    storedOrder($repo, 3, OrderStatus::Open);
    $read = new ReadOrders($repo);

    expect($read->get(3)->id)->toBe(3)
        ->and(fn () => $read->get(4))->toThrow(OrderNotFound::class);
});

it('builds the kitchen ticket or the bill of an order', function (): void {
    $repo = new InMemoryOrderRepository;
    storedOrder($repo, 3, OrderStatus::Open);
    $read = new ReadOrders($repo);

    expect($read->ticket(3, TicketKind::Kitchen))->toEqual(KitchenTicket::of($repo->orders[3]))
        ->and($read->ticket(3, TicketKind::Bill))->toEqual(Bill::of($repo->orders[3]));
    expect(fn () => $read->ticket(4, TicketKind::Bill))->toThrow(OrderNotFound::class);
});
