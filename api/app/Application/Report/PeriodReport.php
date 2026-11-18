<?php

declare(strict_types=1);

namespace App\Application\Report;

/**
 * Sales in [from, to). Orders count by creation time and leave cancelled ones out; payments count by
 * payment time and leave voided ones out. Revenue = Σ order totals (lines + add-ons + delivery fee).
 */
final readonly class PeriodReport
{
    /**
     * @param  list<array{item_name: string, variant_name: string, qty: int, amount_cents: int}>  $byItem
     * @param  list<array{method: string, count: int, amount_cents: int}>  $byMethod
     * @param  list<array{user_id: int, user_name: ?string, orders_count: int, revenue_cents: int}>  $byWaitress
     */
    public function __construct(
        public \DateTimeImmutable $from,
        public \DateTimeImmutable $to,
        public int $ordersCount,
        public int $cancelledCount,
        public int $revenueCents,
        public array $byItem,
        public array $byMethod,
        public array $byWaitress,
    ) {}
}
