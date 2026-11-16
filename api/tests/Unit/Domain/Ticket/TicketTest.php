<?php

declare(strict_types=1);

use App\Domain\Order\LineAddon;
use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderType;
use App\Domain\Payment\PaymentMethod;
use App\Domain\Ticket\Bill;
use App\Domain\Ticket\KitchenTicket;
use App\Domain\Ticket\TicketKind;

function ticketOrder(?OrderDetails $details = null): Order
{
    $line = new OrderLine(1, 100, 'Philadelphia', 'Inteiro', 3200, 2, 'sem cebolinha', [new LineAddon(1000, 'Cream cheese', 300)], 'Uramaki');

    return Order::place(42, $details ?? new OrderDetails(OrderType::DineIn, 'Amanda', note: 'mesa da janela'), [$line], 7, new DateTimeImmutable('2026-11-16 12:00'));
}

function cashDelivery(?int $changeFor): OrderDetails
{
    return new OrderDetails(OrderType::Delivery, 'Ana', addressText: 'Rua A, 1', deliveryFeeCents: 700,
        payOnDelivery: true, changeForCents: $changeFor, payMethod: PaymentMethod::Cash);
}

it('builds the kitchen ticket from the order lines, not updated on the first print', function (): void {
    $order = ticketOrder();
    $ticket = KitchenTicket::of($order);

    expect($ticket->number)->toBe(42)
        ->and($ticket->type)->toBe(OrderType::DineIn)
        ->and($ticket->customerName)->toBe('Amanda')
        ->and($ticket->note)->toBe('mesa da janela')
        ->and($ticket->lines)->toBe($order->lines)
        ->and($ticket->version)->toBe(1)
        ->and($ticket->updatedVersion)->toBeNull()
        ->and($ticket->cancelled)->toBeFalse();
});

it('marks the kitchen ticket updated with the version once the kitchen has an older print', function (): void {
    $order = ticketOrder();
    $order->markPrinted(TicketKind::Kitchen, 1);
    $order->edit($order->details, $order->lines);

    expect(KitchenTicket::of($order)->updatedVersion)->toBe(2);
});

it('prints a cancelled order as a cancel ticket with the reason', function (): void {
    $order = ticketOrder();
    $order->cancel('cliente desistiu');
    $ticket = KitchenTicket::of($order);

    expect($ticket->cancelled)->toBeTrue()
        ->and($ticket->cancelReason)->toBe('cliente desistiu');
});

it('builds the bill with domain totals and the delivery details', function (): void {
    $bill = Bill::of(ticketOrder(cashDelivery(10000)));

    expect($bill->subtotalCents)->toBe(7000)
        ->and($bill->deliveryFeeCents)->toBe(700)
        ->and($bill->totalCents)->toBe(7700)
        ->and($bill->addressText)->toBe('Rua A, 1')
        ->and($bill->payOnDelivery)->toBeTrue()
        ->and($bill->payMethod)->toBe(PaymentMethod::Cash)
        ->and($bill->changeForCents)->toBe(10000)
        ->and($bill->changeCents)->toBe(2300);
});

it('shows no change when there is no troco para, or it does not cover the total', function (?int $changeFor): void {
    expect(Bill::of(ticketOrder(cashDelivery($changeFor)))->changeCents)->toBeNull();
})->with([null, 5000]);
