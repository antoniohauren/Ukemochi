<?php

declare(strict_types=1);

use App\Application\Cash\ManageCash;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Cash\MovementKind;
use App\Domain\Cash\NoOpenShift;
use App\Domain\Cash\ShiftAlreadyOpen;
use App\Domain\Cash\ShiftNotFound;
use Tests\Fakes\FixedClock;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemoryShiftRepository;

/** @return array{ManageCash, InMemoryShiftRepository, InMemoryAuditLog, InMemorySessionAuth} */
function manageCash(): array
{
    $shifts = new InMemoryShiftRepository;
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->userId = 7;

    return [new ManageCash($shifts, new ImmediateTransaction, $audit, $session, new FixedClock), $shifts, $audit, $session];
}

it('opens one shift at a time and audits it', function (): void {
    [$cash, , $audit] = manageCash();

    $report = $cash->open(10000, 'cofre');

    expect([$report->shift->id, $report->shift->openedBy, $report->expectedCents])->toBe([1, 7, 10000])
        ->and($audit->entries[0])->toMatchArray(['userId' => 7, 'entity' => 'shift', 'entityId' => 1, 'action' => 'open', 'note' => 'cofre'])
        ->and(fn () => $cash->open(0, null))->toThrow(ShiftAlreadyOpen::class);
});

it('records movements on the open shift only', function (): void {
    [$cash, , $audit] = manageCash();
    expect(fn () => $cash->addMovement(MovementKind::Withdrawal, 100, null, null))->toThrow(NoOpenShift::class);

    $cash->open(10000, null);
    $report = $cash->addMovement(MovementKind::StaffMeal, 2200, 'Amanda', 'almoço');

    expect($report->staffMealsCents)->toBe(2200)
        ->and($report->expectedCents)->toBe(7800)
        ->and($audit->entries[1])->toMatchArray(['action' => 'movement', 'note' => 'almoço'])
        ->and($audit->entries[1]['summary'])->toBe(['movement_id' => 1, 'kind' => 'staff_meal', 'amount_cents' => 2200, 'staff_name' => 'Amanda']);
});

it('closes with the count against cash payments, then allows a new shift', function (): void {
    [$cash, $shifts, $audit] = manageCash();
    $cash->open(10000, null);
    $shifts->paymentTotals[1] = ['cash' => 5000, 'pix' => 3000];

    $report = $cash->close(14000, 'faltou troco');

    expect([$report->expectedCents, $report->differenceCents, $report->shift->isOpen()])->toBe([15000, -1000, false])
        ->and($audit->entries[1]['summary'])->toBe(['counted_cents' => 14000, 'expected_cents' => 15000, 'difference_cents' => -1000])
        ->and($cash->current())->toBeNull()
        ->and(fn () => $cash->close(0, null))->toThrow(NoOpenShift::class)
        ->and($cash->open(0, null)->shift->id)->toBe(2)
        ->and($cash->get(1)->differenceCents)->toBe(-1000)
        ->and(array_map(fn ($r) => $r->shift->id, $cash->recent()))->toBe([2, 1])
        ->and(fn () => $cash->get(9))->toThrow(ShiftNotFound::class);
});

it('needs a signed-in user', function (): void {
    [$cash, , , $session] = manageCash();
    $session->userId = null;

    expect(fn () => $cash->open(0, null))->toThrow(NotAuthenticated::class);
});
