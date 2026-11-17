<?php

declare(strict_types=1);

namespace App\Application\Payment;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Cash\ShiftRepository;
use App\Application\Clock;
use App\Application\Order\OrderEvents;
use App\Application\Order\OrderRepository;
use App\Application\Transaction;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Cash\NoOpenShift;
use App\Domain\Order\Order;
use App\Domain\Order\OrderNotFound;
use App\Domain\Payment\Payment;
use App\Domain\Payment\PaymentMethod;
use App\Domain\Payment\PaymentNotFound;
use App\Domain\Payment\PaymentShiftClosed;

/**
 * Takes and voids payments. Each locks the order, then the open shift (so a shift cannot close
 * mid-payment), writes the payment, the order status and the audit row in one transaction.
 */
final readonly class ManagePayments
{
    public function __construct(
        private OrderRepository $orders,
        private PaymentRepository $payments,
        private ShiftRepository $shifts,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
        private Clock $clock,
        private OrderEvents $events,
    ) {}

    public function get(int $orderId): OrderPayments
    {
        $order = $this->orders->find($orderId) ?? throw new OrderNotFound($orderId);

        return new OrderPayments($order, $this->payments->forOrder($orderId));
    }

    public function pay(int $orderId, PaymentMethod $method, int $amountCents, ?int $tenderedCents, ?string $payerLabel, ?string $note): OrderPayments
    {
        $userId = $this->userId();

        return $this->announced($this->transaction->run(function () use ($orderId, $method, $amountCents, $tenderedCents, $payerLabel, $note, $userId): OrderPayments {
            $order = $this->orders->lock($orderId) ?? throw new OrderNotFound($orderId);
            $shift = $this->shifts->lockCurrent() ?? throw new NoOpenShift;
            $now = $this->clock->now();
            $payment = Payment::take($orderId, $shift->id, $method, $amountCents, $tenderedCents, $payerLabel, $note, $userId, $now);
            $order->recordPayment($amountCents, $now);
            $payment = $this->payments->add($payment);
            $order = $this->orders->save($order);
            $this->audit->record($userId, 'order', $orderId, 'payment', [
                'payment_id' => $payment->id, 'method' => $method->value, 'amount_cents' => $amountCents,
                'tendered_cents' => $tenderedCents, 'payer_label' => $payment->payerLabel, 'status' => $order->status->value,
            ], $note);

            return new OrderPayments($order, $this->payments->forOrder($orderId));
        }));
    }

    /** Only while the payment's shift is still open: a closed shift's count must not change. */
    public function void(int $paymentId, ?string $note): OrderPayments
    {
        $userId = $this->userId();
        $orderId = ($this->payments->find($paymentId) ?? throw new PaymentNotFound($paymentId))->orderId;

        return $this->announced($this->transaction->run(function () use ($paymentId, $orderId, $note, $userId): OrderPayments {
            $order = $this->orders->lock($orderId) ?? throw new OrderNotFound($orderId);
            // Read again under the order lock: another void may have won.
            $payment = $this->payments->find($paymentId) ?? throw new PaymentNotFound($paymentId);
            if ($this->shifts->lockCurrent()?->id !== $payment->shiftId) {
                throw new PaymentShiftClosed;
            }
            $payment->void();
            $order->voidPayment($payment->amountCents);
            $this->payments->save($payment);
            $order = $this->orders->save($order);
            $this->audit->record($userId, 'order', $orderId, 'void_payment', [
                'payment_id' => $paymentId, 'method' => $payment->method->value, 'amount_cents' => $payment->amountCents, 'status' => $order->status->value,
            ], $note);

            return new OrderPayments($order, $this->payments->forOrder($orderId));
        }));
    }

    private function announced(OrderPayments $result): OrderPayments
    {
        $this->events->updated($result->order->id, $result->order->version);

        return $result;
    }

    private function userId(): int
    {
        return $this->session->userId() ?? throw new NotAuthenticated;
    }
}
