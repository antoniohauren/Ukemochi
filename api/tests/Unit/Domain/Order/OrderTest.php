<?php

declare(strict_types=1);

use App\Domain\Order\AddressRequired;
use App\Domain\Order\CancelReasonRequired;
use App\Domain\Order\CustomerNameRequired;
use App\Domain\Order\InvalidAmount;
use App\Domain\Order\InvalidDeliveryFee;
use App\Domain\Order\InvalidPayMethod;
use App\Domain\Order\InvalidQty;
use App\Domain\Order\InvalidTransition;
use App\Domain\Order\LineAddon;
use App\Domain\Order\NoLines;
use App\Domain\Order\Order;
use App\Domain\Order\OrderCancelled;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Payment\PaymentMethod;

function aLine(int $unit = 3200, int $qty = 1, int ...$addons): OrderLine
{
    return new OrderLine(0, 1, 'Philadelphia', 'Inteiro 8un', $unit, $qty, null,
        array_values(array_map(fn (int $cents) => new LineAddon(1, 'Cream cheese', $cents), $addons)));
}

function anOrder(OrderType $type = OrderType::DineIn, int $fee = 0, ?OrderLine $line = null): Order
{
    $details = new OrderDetails($type, 'Amanda', addressText: $type === OrderType::Delivery ? 'Rua A, 1' : null, deliveryFeeCents: $fee);

    return Order::place(42, $details, [$line ?? aLine()], 7, new DateTimeImmutable('2026-11-16 12:00'));
}

it('opens a new order at version 1, never printed', function (): void {
    $order = anOrder();

    expect($order->status)->toBe(OrderStatus::Open)
        ->and($order->version)->toBe(1)
        ->and($order->printedVersion)->toBe(0)
        ->and($order->id)->toBe(42);
});

it('totals qty times unit plus add-ons, plus the delivery fee', function (): void {
    $order = Order::place(1, new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', deliveryFeeCents: 700), [
        aLine(3200, 2, 300, 150),
        aLine(990, 3),
    ], 7, new DateTimeImmutable);

    // 2 × (3200 + 450) + 3 × 990 + 700
    expect($order->lines[0]->totalCents())->toBe(7300)
        ->and($order->subtotalCents())->toBe(10270)
        ->and($order->totalCents())->toBe(10970);
});

it('refuses an order without lines', function (): void {
    Order::place(1, new OrderDetails(OrderType::Pickup, 'Ana'), [], 7, new DateTimeImmutable);
})->throws(NoLines::class);

it('refuses a line with zero quantity or a negative price', function (int $unit, int $qty, string $error): void {
    expect(fn () => aLine($unit, $qty))->toThrow($error);
})->with([
    [100, 0, InvalidQty::class],
    [-1, 1, InvalidAmount::class],
]);

it('refuses a negative add-on price', function (): void {
    new LineAddon(1, 'x', -1);
})->throws(InvalidAmount::class);

it('validates order details', function (Closure $details, string $error): void {
    expect($details)->toThrow($error);
})->with([
    'blank name' => [fn () => new OrderDetails(OrderType::DineIn, '  '), CustomerNameRequired::class],
    'delivery without address' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: ' '), AddressRequired::class],
    'fee on pickup' => [fn () => new OrderDetails(OrderType::Pickup, 'Ana', deliveryFeeCents: 500), InvalidDeliveryFee::class],
    'negative fee' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', deliveryFeeCents: -1), InvalidDeliveryFee::class],
    'negative change for' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', changeForCents: -1), InvalidAmount::class],
    'pay on delivery without method' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', payOnDelivery: true), InvalidPayMethod::class],
    'method without pay on delivery' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', payMethod: PaymentMethod::Pix), InvalidPayMethod::class],
    'change for on card' => [fn () => new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', payOnDelivery: true, changeForCents: 5000, payMethod: PaymentMethod::Debit), InvalidPayMethod::class],
]);

it('records the pay on delivery method, with change only for cash', function (): void {
    $cash = new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', payOnDelivery: true, changeForCents: 10000, payMethod: PaymentMethod::Cash);
    $card = new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A', payOnDelivery: true, payMethod: PaymentMethod::Credit);

    expect($cash->changeForCents)->toBe(10000)->and($card->payMethod)->toBe(PaymentMethod::Credit);
});

it('moves a delivery order open, ready, out for delivery, closed', function (): void {
    $order = anOrder(OrderType::Delivery, 700);
    $at = new DateTimeImmutable('2026-11-16 13:00');

    $order->moveTo(OrderStatus::Ready, $at);
    $order->moveTo(OrderStatus::OutForDelivery, $at);
    expect($order->closedAt)->toBeNull();
    $order->moveTo(OrderStatus::Closed, $at);

    expect($order->status)->toBe(OrderStatus::Closed)
        ->and($order->closedAt)->toBe($at)
        ->and($order->version)->toBe(1);
});

it('closes an open order directly (paid or closed by hand)', function (): void {
    $order = anOrder();
    $order->moveTo(OrderStatus::Closed, new DateTimeImmutable);

    expect($order->status)->toBe(OrderStatus::Closed);
});

it('refuses invalid moves', function (OrderType $type, array $path, OrderStatus $to): void {
    /** @var list<OrderStatus> $path */
    $order = anOrder($type);
    foreach ($path as $step) {
        $order->moveTo($step, new DateTimeImmutable);
    }

    expect(fn () => $order->moveTo($to, new DateTimeImmutable))->toThrow(InvalidTransition::class);
})->with([
    'out for delivery on pickup' => [OrderType::Pickup, [OrderStatus::Ready], OrderStatus::OutForDelivery],
    'out for delivery before ready' => [OrderType::Delivery, [], OrderStatus::OutForDelivery],
    'back to open' => [OrderType::DineIn, [OrderStatus::Ready], OrderStatus::Open],
    'cancel without reason' => [OrderType::DineIn, [], OrderStatus::Cancelled],
    'closed to ready' => [OrderType::DineIn, [OrderStatus::Closed], OrderStatus::Ready],
    'same status' => [OrderType::DineIn, [], OrderStatus::Open],
]);

it('cancels with a trimmed reason and bumps the version', function (): void {
    $order = anOrder();
    $order->cancel('  cliente desistiu ');

    expect($order->status)->toBe(OrderStatus::Cancelled)
        ->and($order->cancelReason)->toBe('cliente desistiu')
        ->and($order->version)->toBe(2);
});

it('refuses to cancel without a reason', function (): void {
    anOrder()->cancel('   ');
})->throws(CancelReasonRequired::class);

it('keeps a cancelled order final', function (Closure $change): void {
    $order = anOrder();
    $order->cancel('engano');

    expect(fn () => $change($order))->toThrow(OrderCancelled::class);
})->with([
    'edit' => [fn (Order $o) => $o->edit($o->details, $o->lines)],
    'move' => [fn (Order $o) => $o->moveTo(OrderStatus::Closed, new DateTimeImmutable)],
    'reopen' => [fn (Order $o) => $o->reopen()],
    'cancel again' => [fn (Order $o) => $o->cancel('de novo')],
]);

it('reopens a closed order and bumps the version', function (): void {
    $order = anOrder();
    $order->moveTo(OrderStatus::Closed, new DateTimeImmutable);
    $order->reopen();

    expect($order->status)->toBe(OrderStatus::Open)
        ->and($order->closedAt)->toBeNull()
        ->and($order->version)->toBe(2);
});

it('reopens only closed orders', function (): void {
    anOrder()->reopen();
})->throws(InvalidTransition::class);

it('bumps the version on edit and keeps the status of an active order', function (): void {
    $order = anOrder();
    $order->moveTo(OrderStatus::Ready, new DateTimeImmutable);
    $order->edit(new OrderDetails(OrderType::DineIn, 'Amanda', note: 'sem wasabi'), [aLine(1000, 2)]);

    expect($order->status)->toBe(OrderStatus::Ready)
        ->and($order->version)->toBe(2)
        ->and($order->details->note)->toBe('sem wasabi')
        ->and($order->totalCents())->toBe(2000);
});

it('reopens a closed order when it is edited, with one version bump', function (): void {
    $order = anOrder();
    $order->moveTo(OrderStatus::Closed, new DateTimeImmutable);
    $order->edit($order->details, [aLine(), aLine(500)]);

    expect($order->status)->toBe(OrderStatus::Open)
        ->and($order->closedAt)->toBeNull()
        ->and($order->version)->toBe(2);
});

it('moves an order out for delivery back to ready when it stops being a delivery', function (): void {
    $order = anOrder(OrderType::Delivery, 700);
    $order->moveTo(OrderStatus::Ready, new DateTimeImmutable);
    $order->moveTo(OrderStatus::OutForDelivery, new DateTimeImmutable);
    $order->edit(new OrderDetails(OrderType::Pickup, 'Amanda'), $order->lines);

    expect($order->status)->toBe(OrderStatus::Ready);
});

it('refuses an edit that removes every line', function (): void {
    $order = anOrder();
    $order->edit($order->details, []);
})->throws(NoLines::class);
