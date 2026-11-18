<?php

declare(strict_types=1);

namespace App\Infrastructure\Report;

use App\Application\Report\PeriodReport;
use App\Application\Report\ReportReader;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;

/**
 * Aggregates in SQL so a month of orders is a handful of queries.
 * The line total here mirrors the domain rule: qty × (unit + Σ add-ons); order total adds the delivery fee.
 */
final readonly class DatabaseReportReader implements ReportReader
{
    public function __construct(private ConnectionInterface $db) {}

    public function period(\DateTimeImmutable $from, \DateTimeImmutable $to): PeriodReport
    {
        $totals = $this->db->table('orders as o')
            ->leftJoinSub($this->lineTotals(), 'lt', 'lt.order_id', '=', 'o.id')
            ->tap(fn (Builder $q) => $this->inPeriod($q, $from, $to))
            ->where('o.status', '<>', 'cancelled')
            ->groupBy('o.id', 'o.created_by', 'o.delivery_fee_cents')
            ->selectRaw('o.id, o.created_by, o.delivery_fee_cents + coalesce(sum(lt.cents), 0) as total');

        /** @var object{n: int, revenue: int|string|null} $sum */
        $sum = $this->db->table($totals, 't')->selectRaw('count(*) as n, sum(total) as revenue')->first();

        $cancelled = $this->db->table('orders as o')->tap(fn (Builder $q) => $this->inPeriod($q, $from, $to))
            ->where('o.status', 'cancelled')->count();

        $byItem = $this->db->table($this->lineTotals(), 'lt')
            ->join('orders as o', 'o.id', '=', 'lt.order_id')
            ->tap(fn (Builder $q) => $this->inPeriod($q, $from, $to))
            ->where('o.status', '<>', 'cancelled')
            ->groupBy('lt.item_name', 'lt.variant_name')
            ->selectRaw('lt.item_name, lt.variant_name, sum(lt.qty) as qty, sum(lt.cents) as cents')
            ->orderByDesc('cents')->orderBy('lt.item_name')->orderBy('lt.variant_name')->get();

        $byMethod = $this->db->table('payments')
            ->where('created_at', '>=', $from)->where('created_at', '<', $to)->where('voided', false)
            ->groupBy('method')
            ->selectRaw('method, count(*) as n, sum(amount_cents) as cents')
            ->orderByDesc('cents')->orderBy('method')->get();

        $byWaitress = $this->db->table($totals, 't')
            ->leftJoin('users as u', 'u.id', '=', 't.created_by')
            ->groupBy('t.created_by', 'u.name')
            ->selectRaw('t.created_by, u.name, count(*) as n, sum(t.total) as cents')
            ->orderByDesc('cents')->orderBy('u.name')->get();

        return new PeriodReport(
            $from,
            $to,
            (int) $sum->n,
            $cancelled,
            (int) $sum->revenue,
            array_values($byItem->map(function (object $r): array {
                /** @var object{item_name: string, variant_name: string, qty: int|string, cents: int|string} $r */
                return ['item_name' => $r->item_name, 'variant_name' => $r->variant_name, 'qty' => (int) $r->qty, 'amount_cents' => (int) $r->cents];
            })->all()),
            array_values($byMethod->map(function (object $r): array {
                /** @var object{method: string, n: int, cents: int|string} $r */
                return ['method' => $r->method, 'count' => (int) $r->n, 'amount_cents' => (int) $r->cents];
            })->all()),
            array_values($byWaitress->map(function (object $r): array {
                /** @var object{created_by: int, name: ?string, n: int, cents: int|string} $r */
                return ['user_id' => (int) $r->created_by, 'user_name' => $r->name, 'orders_count' => (int) $r->n, 'revenue_cents' => (int) $r->cents];
            })->all()),
        );
    }

    /** One row per order line with its total in cents. */
    private function lineTotals(): Builder
    {
        $addons = $this->db->table('line_addons')->groupBy('line_id')->selectRaw('line_id, sum(price_cents) as cents');

        return $this->db->table('order_lines as l')
            ->leftJoinSub($addons, 'la', 'la.line_id', '=', 'l.id')
            ->selectRaw('l.order_id, l.item_name, l.variant_name, l.qty, l.qty * (l.unit_price_cents + coalesce(la.cents, 0)) as cents');
    }

    private function inPeriod(Builder $q, \DateTimeImmutable $from, \DateTimeImmutable $to): void
    {
        $q->where('o.created_at', '>=', $from)->where('o.created_at', '<', $to);
    }
}
