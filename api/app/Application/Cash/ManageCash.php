<?php

declare(strict_types=1);

namespace App\Application\Cash;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Clock;
use App\Application\Transaction;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Cash\CashMovement;
use App\Domain\Cash\MovementKind;
use App\Domain\Cash\NoOpenShift;
use App\Domain\Cash\Shift;
use App\Domain\Cash\ShiftAlreadyOpen;
use App\Domain\Cash\ShiftNotFound;
use App\Domain\Cash\ShiftReport;

/** Opens, moves cash in and out of, and closes the one open shift. Each write is audited in its transaction. */
final readonly class ManageCash
{
    public function __construct(
        private ShiftRepository $shifts,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
        private Clock $clock,
    ) {}

    public function open(int $floatCents, ?string $note): ShiftReport
    {
        $userId = $this->userId();

        return $this->transaction->run(function () use ($floatCents, $note, $userId): ShiftReport {
            if ($this->shifts->lockCurrent() !== null) {
                throw new ShiftAlreadyOpen;
            }
            $shift = $this->shifts->save(Shift::open($floatCents, $userId, $this->clock->now(), $note));
            $this->audit->record($userId, 'shift', $shift->id, 'open', ['opening_float_cents' => $floatCents], $note);

            return $this->report($shift);
        });
    }

    public function addMovement(MovementKind $kind, int $amountCents, ?string $staffName, ?string $note): ShiftReport
    {
        $userId = $this->userId();

        return $this->transaction->run(function () use ($kind, $amountCents, $staffName, $note, $userId): ShiftReport {
            $shift = $this->shifts->lockCurrent() ?? throw new NoOpenShift;
            $m = $this->shifts->addMovement(CashMovement::record($shift->id, $kind, $amountCents, $staffName, $note, $userId, $this->clock->now()));
            $this->audit->record($userId, 'shift', $shift->id, 'movement', [
                'movement_id' => $m->id, 'kind' => $kind->value, 'amount_cents' => $amountCents, 'staff_name' => $m->staffName,
            ], $note);

            return $this->report($shift);
        });
    }

    public function close(int $countedCents, ?string $note): ShiftReport
    {
        $userId = $this->userId();

        return $this->transaction->run(function () use ($countedCents, $note, $userId): ShiftReport {
            $shift = $this->shifts->lockCurrent() ?? throw new NoOpenShift;
            $shift->close($countedCents, $userId, $this->clock->now(), $note);
            $report = $this->report($this->shifts->save($shift));
            $this->audit->record($userId, 'shift', $shift->id, 'close', [
                'counted_cents' => $countedCents, 'expected_cents' => $report->expectedCents, 'difference_cents' => $report->differenceCents,
            ], $note);

            return $report;
        });
    }

    public function current(): ?ShiftReport
    {
        $shift = $this->shifts->current();

        return $shift === null ? null : $this->report($shift);
    }

    public function get(int $id): ShiftReport
    {
        return $this->report($this->shifts->find($id) ?? throw new ShiftNotFound($id));
    }

    /**
     * shortcut: newest 30 shifts, no paging, three queries per shift; add paging with reports (step 22).
     *
     * @return list<ShiftReport>
     */
    public function recent(): array
    {
        return array_map($this->report(...), $this->shifts->recent(30));
    }

    private function report(Shift $shift): ShiftReport
    {
        return new ShiftReport($shift, $this->shifts->movements($shift->id), $this->shifts->paymentTotals($shift->id));
    }

    private function userId(): int
    {
        return $this->session->userId() ?? throw new NotAuthenticated;
    }
}
