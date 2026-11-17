<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment;

use App\Application\Payment\PaymentRepository;
use App\Domain\Payment\Payment;
use App\Domain\Payment\PaymentMethod;
use App\Domain\Split\Fraction;
use App\Domain\Split\Pick;
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
        $this->db->table('payment_allocations')->insert(array_map(fn (Pick $a) => [
            'payment_id' => $id, 'line_id' => $a->lineId, 'qty_num' => $a->qty->num, 'qty_den' => $a->qty->den,
        ], $p->allocations));

        return $this->find((int) $id) ?? throw new \LogicException("Payment {$id} vanished after insert.");
    }

    public function find(int $id): ?Payment
    {
        return $this->load($this->payments()->where('id', $id))[0] ?? null;
    }

    public function save(Payment $payment): void
    {
        $this->payments()->where('id', $payment->id)->update(['voided' => $payment->voided]);
    }

    public function forOrder(int $orderId): array
    {
        return $this->load($this->payments()->where('order_id', $orderId)->orderBy('id'));
    }

    /** @return list<Payment> with their allocations, in query order */
    private function load(Builder $query): array
    {
        $rows = $query->get();
        $allocations = [];
        foreach ($this->db->table('payment_allocations')->whereIn('payment_id', $rows->pluck('id'))->orderBy('line_id')->get() as $a) {
            /** @var object{payment_id: int, line_id: int, qty_num: int, qty_den: int} $a */
            $allocations[$a->payment_id][] = new Pick($a->line_id, new Fraction($a->qty_num, $a->qty_den));
        }

        return array_values($rows->map(fn (object $r) => self::payment($r, $allocations))->all());
    }

    private function payments(): Builder
    {
        return $this->db->table('payments');
    }

    /** @param  array<int, list<Pick>>  $allocations  per payment id */
    private static function payment(object $r, array $allocations): Payment
    {
        /** @var object{id: int, order_id: int, shift_id: int, method: string, amount_cents: int, tendered_cents: ?int, payer_label: ?string, note: ?string, created_by: int, created_at: string, voided: bool} $r */
        return new Payment(
            $r->id, $r->order_id, $r->shift_id, PaymentMethod::from($r->method), $r->amount_cents, $r->tendered_cents,
            $r->payer_label, $r->note, $r->created_by, new \DateTimeImmutable($r->created_at), $r->voided,
            $allocations[$r->id] ?? [],
        );
    }
}
