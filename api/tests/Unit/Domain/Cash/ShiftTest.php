<?php

declare(strict_types=1);

use App\Domain\Cash\CashMovement;
use App\Domain\Cash\InvalidCashAmount;
use App\Domain\Cash\MovementKind;
use App\Domain\Cash\Shift;
use App\Domain\Cash\ShiftClosed;
use App\Domain\Cash\ShiftReport;
use App\Domain\Cash\StaffNameRequired;

function cashAt(string $time = '12:00'): DateTimeImmutable
{
    return new DateTimeImmutable("2026-11-16 {$time}:00+00:00");
}

function cashMovement(MovementKind $kind, int $cents, ?string $staff = null): CashMovement
{
    return CashMovement::record(1, $kind, $cents, $staff, null, 7, cashAt());
}

it('opens with a float and closes once with the counted cash', function (): void {
    $shift = Shift::open(10000, 7, cashAt('10:00'), 'troco do cofre');
    expect($shift->isOpen())->toBeTrue();

    $shift->close(12000, 8, cashAt('22:00'), null);

    expect($shift->isOpen())->toBeFalse()
        ->and([$shift->countedCents, $shift->closedBy, $shift->closedAt, $shift->note])->toEqual([12000, 8, cashAt('22:00'), 'troco do cofre'])
        ->and(fn () => $shift->close(12000, 8, cashAt('23:00'), null))->toThrow(ShiftClosed::class);
});

it('refuses a negative float or count', function (): void {
    expect(fn () => Shift::open(-1, 7, cashAt(), null))->toThrow(InvalidCashAmount::class)
        ->and(fn () => Shift::open(0, 7, cashAt(), null)->close(-1, 7, cashAt(), null))->toThrow(InvalidCashAmount::class);
});

it('needs a positive movement amount and a staff name for a staff meal', function (): void {
    expect(fn () => cashMovement(MovementKind::Withdrawal, 0))->toThrow(InvalidCashAmount::class)
        ->and(fn () => cashMovement(MovementKind::StaffMeal, 2200, '  '))->toThrow(StaffNameRequired::class)
        ->and(cashMovement(MovementKind::StaffMeal, 2200, ' Amanda ')->staffName)->toBe('Amanda')
        ->and(cashMovement(MovementKind::Deposit, 100, 'Amanda')->staffName)->toBeNull();
});

it('expects float + cash payments − withdrawals − staff meals + deposits', function (): void {
    $shift = Shift::open(10000, 7, cashAt('10:00'), null);
    $report = new ShiftReport($shift, [
        cashMovement(MovementKind::Withdrawal, 5000),
        cashMovement(MovementKind::StaffMeal, 2200, 'Amanda'),
        cashMovement(MovementKind::Deposit, 1000),
        cashMovement(MovementKind::Withdrawal, 300),
    ], ['cash' => 8000, 'pix' => 4500]);

    expect($report->withdrawalsCents)->toBe(5300)
        ->and($report->staffMealsCents)->toBe(2200)
        ->and($report->depositsCents)->toBe(1000)
        ->and($report->expectedCents)->toBe(10000 + 8000 - 5300 - 2200 + 1000)
        ->and($report->totalsByMethod)->toBe(['cash' => 8000, 'credit' => 0, 'debit' => 0, 'pix' => 4500])
        ->and($report->differenceCents)->toBeNull();
});

it('shows the difference between counted and expected once closed', function (): void {
    $shift = Shift::open(10000, 7, cashAt('10:00'), null);
    $shift->close(9500, 7, cashAt('22:00'), null);

    expect((new ShiftReport($shift, [], ['cash' => 0]))->differenceCents)->toBe(-500);
});
