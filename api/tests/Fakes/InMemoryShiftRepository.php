<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Cash\ShiftRepository;
use App\Domain\Cash\CashMovement;
use App\Domain\Cash\Shift;
use App\Domain\Cash\ShiftAlreadyOpen;

final class InMemoryShiftRepository implements ShiftRepository
{
    /** @var array<int, Shift> */
    public array $shifts = [];

    /** @var list<CashMovement> */
    public array $movements = [];

    /** @var array<int, array<string, int>> */
    public array $paymentTotals = [];

    public function current(): ?Shift
    {
        foreach ($this->shifts as $shift) {
            if ($shift->isOpen()) {
                return $shift;
            }
        }

        return null;
    }

    public function lockCurrent(): ?Shift
    {
        return $this->current();
    }

    public function find(int $id): ?Shift
    {
        return $this->shifts[$id] ?? null;
    }

    public function recent(int $limit): array
    {
        return array_slice(array_reverse(array_values($this->shifts)), 0, $limit);
    }

    public function save(Shift $shift): Shift
    {
        if ($shift->id === 0) {
            if ($this->current() !== null) {
                throw new ShiftAlreadyOpen;
            }
            $shift = new Shift(count($this->shifts) + 1, $shift->openedBy, $shift->openedAt, $shift->openingFloatCents, note: $shift->note);
        }
        $this->shifts[$shift->id] = $shift;

        return $shift;
    }

    public function addMovement(CashMovement $m): CashMovement
    {
        $m = new CashMovement(count($this->movements) + 1, $m->shiftId, $m->kind, $m->amountCents, $m->staffName, $m->note, $m->createdBy, $m->createdAt);
        $this->movements[] = $m;

        return $m;
    }

    public function movements(int $shiftId): array
    {
        return array_values(array_filter($this->movements, fn (CashMovement $m) => $m->shiftId === $shiftId));
    }

    public function paymentTotals(int $shiftId): array
    {
        return $this->paymentTotals[$shiftId] ?? [];
    }
}
