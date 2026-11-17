<?php

declare(strict_types=1);

namespace App\Domain\Cash;

/** Cash drawer session, opened by hand with a float and closed once with the counted cash. */
final class Shift
{
    public function __construct(
        public readonly int $id,
        public readonly int $openedBy,
        public readonly \DateTimeImmutable $openedAt,
        public readonly int $openingFloatCents,
        public private(set) ?int $closedBy = null,
        public private(set) ?\DateTimeImmutable $closedAt = null,
        public private(set) ?int $countedCents = null,
        public private(set) ?string $note = null,
    ) {}

    public static function open(int $floatCents, int $by, \DateTimeImmutable $at, ?string $note): self
    {
        if ($floatCents < 0) {
            throw new InvalidCashAmount;
        }

        return new self(0, $by, $at, $floatCents, note: $note);
    }

    public function isOpen(): bool
    {
        return $this->closedAt === null;
    }

    /** A close note replaces the open note; none keeps it. */
    public function close(int $countedCents, int $by, \DateTimeImmutable $at, ?string $note): void
    {
        if (! $this->isOpen()) {
            throw new ShiftClosed;
        }
        if ($countedCents < 0) {
            throw new InvalidCashAmount;
        }
        $this->countedCents = $countedCents;
        $this->closedBy = $by;
        $this->closedAt = $at;
        $this->note = $note ?? $this->note;
    }
}
