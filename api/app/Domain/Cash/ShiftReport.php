<?php

declare(strict_types=1);

namespace App\Domain\Cash;

use App\Domain\Payment\PaymentMethod;

/**
 * A shift with its movements and money. Expected cash = opening float + cash payments − withdrawals
 * − staff meals + deposits; difference = counted − expected, null while the shift is open.
 */
final readonly class ShiftReport
{
    /** @var array<value-of<PaymentMethod>, int> non-voided payments per method, every method present */
    public array $totalsByMethod;

    public int $withdrawalsCents;

    public int $staffMealsCents;

    public int $depositsCents;

    public int $expectedCents;

    public ?int $differenceCents;

    /**
     * @param  list<CashMovement>  $movements
     * @param  array<string, int>  $paymentTotals  non-voided payment cents per method value; missing methods are zero
     */
    public function __construct(public Shift $shift, public array $movements, array $paymentTotals)
    {
        $totals = [];
        foreach (PaymentMethod::cases() as $method) {
            $totals[$method->value] = $paymentTotals[$method->value] ?? 0;
        }
        $this->totalsByMethod = $totals;

        $sum = fn (MovementKind $kind): int => array_sum(array_map(
            fn (CashMovement $m) => $m->amountCents,
            array_filter($movements, fn (CashMovement $m) => $m->kind === $kind),
        ));
        $this->withdrawalsCents = $sum(MovementKind::Withdrawal);
        $this->staffMealsCents = $sum(MovementKind::StaffMeal);
        $this->depositsCents = $sum(MovementKind::Deposit);
        $this->expectedCents = $shift->openingFloatCents + $totals['cash'] - $this->withdrawalsCents - $this->staffMealsCents + $this->depositsCents;
        $this->differenceCents = $shift->countedCents === null ? null : $shift->countedCents - $this->expectedCents;
    }
}
