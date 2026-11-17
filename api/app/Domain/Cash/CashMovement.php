<?php

declare(strict_types=1);

namespace App\Domain\Cash;

/** Withdrawal, deposit or staff meal in a shift. Only a staff meal keeps a staff name (e.g. R$22 Amanda). */
final readonly class CashMovement
{
    public function __construct(
        public int $id,
        public int $shiftId,
        public MovementKind $kind,
        public int $amountCents,
        public ?string $staffName,
        public ?string $note,
        public int $createdBy,
        public \DateTimeImmutable $createdAt,
    ) {}

    public static function record(int $shiftId, MovementKind $kind, int $amountCents, ?string $staffName, ?string $note, int $by, \DateTimeImmutable $at): self
    {
        if ($amountCents <= 0) {
            throw new InvalidCashAmount;
        }
        $name = $kind === MovementKind::StaffMeal ? trim($staffName ?? '') : null;
        if ($name === '') {
            throw new StaffNameRequired;
        }

        return new self(0, $shiftId, $kind, $amountCents, $name, $note, $by, $at);
    }
}
