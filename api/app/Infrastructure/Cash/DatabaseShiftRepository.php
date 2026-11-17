<?php

declare(strict_types=1);

namespace App\Infrastructure\Cash;

use App\Application\Cash\ShiftRepository;
use App\Domain\Cash\CashMovement;
use App\Domain\Cash\MovementKind;
use App\Domain\Cash\Shift;
use App\Domain\Cash\ShiftAlreadyOpen;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\UniqueConstraintViolationException;

final readonly class DatabaseShiftRepository implements ShiftRepository
{
    /** Keeps the offset; Postgres reads it back into timestamptz. */
    private const string TIME = 'Y-m-d H:i:s.uP';

    public function __construct(private ConnectionInterface $db) {}

    public function current(): ?Shift
    {
        return $this->one($this->shifts()->whereNull('closed_at'));
    }

    public function lockCurrent(): ?Shift
    {
        return $this->one($this->shifts()->whereNull('closed_at')->lockForUpdate());
    }

    public function find(int $id): ?Shift
    {
        return $this->one($this->shifts()->where('id', $id));
    }

    public function recent(int $limit): array
    {
        return array_values($this->shifts()->orderByDesc('id')->limit($limit)->get()->map(self::shift(...))->all());
    }

    public function save(Shift $shift): Shift
    {
        $row = [
            'opened_by' => $shift->openedBy, 'opened_at' => $shift->openedAt->format(self::TIME),
            'opening_float_cents' => $shift->openingFloatCents, 'closed_by' => $shift->closedBy,
            'closed_at' => $shift->closedAt?->format(self::TIME), 'counted_cents' => $shift->countedCents, 'note' => $shift->note,
        ];
        if ($shift->id !== 0) {
            $this->shifts()->where('id', $shift->id)->update($row);

            return $this->find($shift->id) ?? throw new \LogicException("Shift {$shift->id} vanished after save.");
        }
        try {
            $id = $this->shifts()->insertGetId($row);
        } catch (UniqueConstraintViolationException) {
            // Another device opened a shift between our check and insert.
            throw new ShiftAlreadyOpen;
        }

        return $this->find((int) $id) ?? throw new \LogicException("Shift {$id} vanished after save.");
    }

    public function addMovement(CashMovement $m): CashMovement
    {
        $id = $this->db->table('cash_movements')->insertGetId([
            'shift_id' => $m->shiftId, 'kind' => $m->kind->value, 'amount_cents' => $m->amountCents, 'staff_name' => $m->staffName,
            'note' => $m->note, 'created_by' => $m->createdBy, 'created_at' => $m->createdAt->format(self::TIME),
        ]);

        return new CashMovement((int) $id, $m->shiftId, $m->kind, $m->amountCents, $m->staffName, $m->note, $m->createdBy, $m->createdAt);
    }

    public function movements(int $shiftId): array
    {
        return array_values($this->db->table('cash_movements')->where('shift_id', $shiftId)->orderBy('id')->get()
            ->map(function (object $r): CashMovement {
                /** @var object{id: int, shift_id: int, kind: string, amount_cents: int, staff_name: ?string, note: ?string, created_by: int, created_at: string} $r */
                return new CashMovement($r->id, $r->shift_id, MovementKind::from($r->kind), $r->amount_cents, $r->staff_name, $r->note, $r->created_by, new \DateTimeImmutable($r->created_at));
            })->all());
    }

    public function paymentTotals(int $shiftId): array
    {
        $totals = [];
        foreach ($this->db->table('payments')->where('shift_id', $shiftId)->where('voided', false)
            ->groupBy('method')->get(['method', $this->db->raw('SUM(amount_cents) AS cents')]) as $row) {
            /** @var object{method: string, cents: int|string} $row */
            $totals[$row->method] = (int) $row->cents;
        }

        return $totals;
    }

    private function shifts(): Builder
    {
        return $this->db->table('shifts');
    }

    private function one(Builder $query): ?Shift
    {
        $row = $query->first();

        return $row === null ? null : self::shift($row);
    }

    private static function shift(object $r): Shift
    {
        /** @var object{id: int, opened_by: int, opened_at: string, opening_float_cents: int, closed_by: ?int, closed_at: ?string, counted_cents: ?int, note: ?string} $r */
        return new Shift(
            $r->id, $r->opened_by, new \DateTimeImmutable($r->opened_at), $r->opening_float_cents, $r->closed_by,
            $r->closed_at === null ? null : new \DateTimeImmutable($r->closed_at), $r->counted_cents, $r->note,
        );
    }
}
