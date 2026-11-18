<?php

declare(strict_types=1);

use App\Domain\Order\Order;
use App\Domain\Order\OrderCancelled;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Payment\InvalidPayment;
use App\Domain\Payment\Payment;
use App\Domain\Payment\PaymentMethod;
use App\Domain\Payment\PaymentVoided;

function aPayment(PaymentMethod $method = PaymentMethod::Cash, int $amount = 3200, ?int $tendered = null): Payment
{
    return Payment::take(42, 1, $method, $amount, $tendered, 'Ana', null, 7, new DateTimeImmutable('2026-11-16 12:00'));
}

/** One R$32 line. */
function toPay(OrderType $type = OrderType::DineIn): Order
{
    $details = new OrderDetails($type, 'Amanda', addressText: $type === OrderType::Delivery ? 'Rua A, 1' : null);

    return Order::place(42, $details, [new OrderLine(0, 1, 'Philadelphia', 'Inteiro', 3200, 1, null, [])], 7, new DateTimeImmutable);
}

it('gives change on cash: tendered − amount', function (): void {
    expect(aPayment(PaymentMethod::Cash, 3200, 5000)->changeCents())->toBe(1800)
        ->and(aPayment(PaymentMethod::Cash, 3200)->changeCents())->toBeNull()
        ->and(aPayment(PaymentMethod::Pix, 3200)->changeCents())->toBeNull();
});

it('refuses a zero amount, tendered below the amount, or tendered on a card', function (): void {
    expect(fn () => aPayment(PaymentMethod::Cash, 0))->toThrow(InvalidPayment::class)
        ->and(fn () => aPayment(PaymentMethod::Cash, 3200, 3199))->toThrow(InvalidPayment::class)
        ->and(fn () => aPayment(PaymentMethod::Credit, 3200, 5000))->toThrow(InvalidPayment::class);
});

it('voids once', function (): void {
    $payment = aPayment();
    $payment->void();

    expect($payment->voided)->toBeTrue()
        ->and(fn () => $payment->void())->toThrow(PaymentVoided::class);
});

it('keeps any order open when paid in full or overpaid; staff close by hand', function (OrderType $type): void {
    $order = toPay($type);
    $order->recordPayment(2000, new DateTimeImmutable);
    expect([$order->paidCents, $order->balanceCents(), $order->status])->toBe([2000, 1200, OrderStatus::Open]);

    $order->recordPayment(3000, new DateTimeImmutable);
    expect([$order->balanceCents(), $order->status, $order->closedAt])->toBe([-1800, OrderStatus::Open, null]);
})->with([OrderType::DineIn, OrderType::Pickup, OrderType::Delivery]);

it('refuses payments on a cancelled order', function (): void {
    $order = toPay();
    $order->cancel('desistiu');

    expect(fn () => $order->recordPayment(100, new DateTimeImmutable))->toThrow(OrderCancelled::class);
});

it('reopens a closed order when a void leaves a balance, without a new kitchen version', function (): void {
    $order = toPay();
    $order->recordPayment(3200, new DateTimeImmutable);
    $order->moveTo(OrderStatus::Closed, new DateTimeImmutable);
    $order->voidPayment(3200);

    expect([$order->paidCents, $order->status, $order->closedAt, $order->version])->toBe([0, OrderStatus::Open, null, 1]);

    $cancelled = toPay();
    $cancelled->recordPayment(1000, new DateTimeImmutable);
    $cancelled->cancel('desistiu');
    $cancelled->voidPayment(1000);
    expect([$cancelled->paidCents, $cancelled->status])->toBe([0, OrderStatus::Cancelled]);
});
