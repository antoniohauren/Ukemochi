<?php

declare(strict_types=1);

use App\Application\Payment\ManagePayments;
use App\Domain\Cash\NoOpenShift;
use App\Domain\Cash\Shift;
use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderNotFound;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Payment\PaymentMethod;
use App\Domain\Payment\PaymentNotFound;
use App\Domain\Payment\PaymentShiftClosed;
use App\Domain\Payment\PaymentVoided;
use Tests\Fakes\FixedClock;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryOrderEvents;
use Tests\Fakes\InMemoryOrderRepository;
use Tests\Fakes\InMemoryPaymentRepository;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemoryShiftRepository;

/**
 * Order 42: dine-in, one R$32 line. Shift 1 open.
 *
 * @return array{ManagePayments, InMemoryOrderRepository, InMemoryShiftRepository, InMemoryAuditLog, InMemoryOrderEvents}
 */
function managePayments(): array
{
    $orders = new InMemoryOrderRepository;
    $orders->save(Order::place(42, new OrderDetails(OrderType::DineIn, 'Amanda'), [new OrderLine(0, 1, 'Philadelphia', 'Inteiro', 3200, 1, null, [])], 7, new DateTimeImmutable));
    $shifts = new InMemoryShiftRepository;
    $shifts->save(Shift::open(0, 7, new DateTimeImmutable, null));
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(7);
    $events = new InMemoryOrderEvents;

    return [new ManagePayments($orders, new InMemoryPaymentRepository, $shifts, new ImmediateTransaction, $audit, $session, new FixedClock, $events), $orders, $shifts, $audit, $events];
}

it('takes a payment on the open shift, closes the order when paid, audits and announces', function (): void {
    [$manage, $orders, , $audit, $events] = managePayments();

    $first = $manage->pay(42, PaymentMethod::Pix, 1200, null, 'Ana', null);
    expect([$first->order->paidCents, $first->order->status])->toBe([1200, OrderStatus::Open]);

    $result = $manage->pay(42, PaymentMethod::Cash, 2000, 5000, null, 'troco');

    expect($result->order->status)->toBe(OrderStatus::Closed)
        ->and(array_map(fn ($p) => [$p->id, $p->shiftId, $p->method, $p->changeCents()], $result->payments))
        ->toBe([[1, 1, PaymentMethod::Pix, null], [2, 1, PaymentMethod::Cash, 3000]])
        ->and($orders->locked)->toBe([42, 42])
        ->and($audit->entries[1])->toMatchArray(['entity' => 'order', 'entityId' => 42, 'action' => 'payment', 'note' => 'troco'])
        ->and($audit->entries[1]['summary'])->toBe([
            'payment_id' => 2, 'method' => 'cash', 'amount_cents' => 2000, 'tendered_cents' => 5000, 'payer_label' => null, 'status' => 'closed',
        ])
        ->and($events->updated)->toHaveCount(2)
        ->and($manage->get(42)->payments)->toHaveCount(2);
});

it('needs an open shift and an existing order', function (): void {
    [$manage, , $shifts] = managePayments();
    expect(fn () => $manage->pay(9, PaymentMethod::Pix, 100, null, null, null))->toThrow(OrderNotFound::class);

    $shifts->current()?->close(0, 7, new DateTimeImmutable, null);
    expect(fn () => $manage->pay(42, PaymentMethod::Pix, 100, null, null, null))->toThrow(NoOpenShift::class);
});

it('voids a payment once, reopening the order, while its shift is open', function (): void {
    [$manage, , $shifts, $audit] = managePayments();
    $manage->pay(42, PaymentMethod::Debit, 3200, null, null, null);

    $result = $manage->void(1, 'errado');

    expect([$result->order->status, $result->order->paidCents, $result->payments[0]->voided])->toBe([OrderStatus::Open, 0, true])
        ->and($audit->entries[1])->toMatchArray(['action' => 'void_payment', 'note' => 'errado'])
        ->and(fn () => $manage->void(1, null))->toThrow(PaymentVoided::class)
        ->and(fn () => $manage->void(9, null))->toThrow(PaymentNotFound::class);

    $manage->pay(42, PaymentMethod::Debit, 3200, null, null, null);
    $shifts->current()?->close(0, 7, new DateTimeImmutable, null);
    $shifts->save(Shift::open(0, 7, new DateTimeImmutable, null));
    expect(fn () => $manage->void(2, null))->toThrow(PaymentShiftClosed::class);
});
