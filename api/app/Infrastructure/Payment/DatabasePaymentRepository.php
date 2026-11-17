<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment;

use App\Application\Payment\PaymentRepository;
use App\Domain\Payment\Payment;
use App\Domain\Payment\PaymentMethod;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;

final readonly class DatabasePaymentRepository implements PaymentRepository
{
    public function __construct(private ConnectionInterface $db) {}

    public function add(Payment $p): Payment
    {
        $id = $this->payments()->insertGetId([
            'order_id' => $p->orderId, 'shift_id' => $p->shiftId, 'method' => $p->method->value, 'amount_cents' => $p->amountCents,
            'tendered_cents' => $p->tenderedCents, 'payer_label' => $p->payerLabel, 'note' => $p->note, 'created_by' => $p->createdBy,
            'created_at' => $p->createdAt->format('Y-m-d H:i:s.uP'), 'voided' => $p->voided,
        ]);

        return $this->find((int) $id) ?? throw new \LogicException("Payment {$id} vanished after insert.");
    }

    public function find(int $id): ?Payment
    {
        $row = $this->payments()->where('id', $id)->first();

        return $row === null ? null : self::payment($row);
    }

    public function save(Payment $payment): void
    {
        $this->payments()->where('id', $payment->id)->update(['voided' => $payment->voided]);
    }

    public function forOrder(int $orderId): array
    {
        return array_values($this->payments()->where('order_id', $orderId)->orderBy('id')->get()->map(self::payment(...))->all());
    }

    private function payments(): Builder
    {
        return $this->db->table('payments');
    }

    private static function payment(object $r): Payment
    {
        /** @var object{id: int, order_id: int, shift_id: int, method: string, amount_cents: int, tendered_cents: ?int, payer_label: ?string, note: ?string, created_by: int, created_at: string, voided: bool} $r */
        return new Payment(
            $r->id, $r->order_id, $r->shift_id, PaymentMethod::from($r->method), $r->amount_cents, $r->tendered_cents,
            $r->payer_label, $r->note, $r->created_by, new \DateTimeImmutable($r->created_at), $r->voided,
        );
    }
}
