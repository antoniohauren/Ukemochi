<?php

declare(strict_types=1);

use App\Application\Cash\ShiftRepository;
use App\Domain\Cash\Shift;
use App\Domain\Cash\ShiftAlreadyOpen;
use App\Infrastructure\Auth\EloquentUser;

it('keeps one open shift even when two inserts race past the check', function (): void {
    $user = EloquentUser::factory()->create();
    $shifts = app(ShiftRepository::class);
    $at = new DateTimeImmutable('2026-11-16 12:00:00-03:00');
    $first = $shifts->save(Shift::open(500, $user->id, $at, null));

    expect($shifts->current()?->openedAt)->toEqual($at)
        ->and($first->openingFloatCents)->toBe(500)
        ->and(fn () => $shifts->save(Shift::open(0, $user->id, $at, null)))->toThrow(ShiftAlreadyOpen::class);
});
