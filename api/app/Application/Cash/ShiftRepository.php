<?php

declare(strict_types=1);

namespace App\Application\Cash;

use App\Domain\Cash\CashMovement;
use App\Domain\Cash\Shift;

interface ShiftRepository
{
    /** The open shift, if any. At most one is open. */
    public function current(): ?Shift;

    /** The open shift, row-locked until the transaction ends. */
    public function lockCurrent(): ?Shift;

    public function find(int $id): ?Shift;

    /** @return list<Shift> newest first */
    public function recent(int $limit): array;

    /** Inserts (id 0) or updates; throws ShiftAlreadyOpen when another shift is open. */
    public function save(Shift $shift): Shift;

    public function addMovement(CashMovement $movement): CashMovement;

    /** @return list<CashMovement> oldest first */
    public function movements(int $shiftId): array;

    /** @return array<string, int> non-voided payment cents per method value */
    public function paymentTotals(int $shiftId): array;
}
