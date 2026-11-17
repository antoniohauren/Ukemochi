<?php

declare(strict_types=1);

namespace App\Domain\Split;

use App\Domain\Order\OrderLine;

/**
 * Split suggestions over an amount (the order's balance). Pure: the UI records each share as a payment.
 */
final class Split
{
    public const int MAX_PAYERS = 50;

    /** Remainder cents go to the first payers. */
    public static function equal(int $amountCents, int $n): SplitResult
    {
        if ($n < 1 || $n > self::MAX_PAYERS) {
            throw new InvalidSplit('Split between 1 and '.self::MAX_PAYERS.' payers.');
        }
        $amount = max(0, $amountCents);
        $base = intdiv($amount, $n);
        $extra = $amount % $n;
        $shares = [];
        for ($i = 0; $i < $n; $i++) {
            $shares[] = new Share(null, $base + ($i < $extra ? 1 : 0));
        }

        return new SplitResult($shares, $amountCents - $amount);
    }

    /**
     * Free amounts for the first payers; one more payer takes the rest, when there is any.
     *
     * @param  list<int>  $amounts
     */
    public static function byAmount(int $amountCents, array $amounts): SplitResult
    {
        if ($amounts === [] || count($amounts) >= self::MAX_PAYERS) {
            throw new InvalidSplit('Split between 1 and '.self::MAX_PAYERS.' payers.');
        }
        $shares = [];
        foreach ($amounts as $cents) {
            if ($cents <= 0) {
                throw new InvalidSplit('Each amount must be above zero.');
            }
            $shares[] = new Share(null, $cents);
        }
        $rest = $amountCents - array_sum($amounts);
        if ($rest < 0) {
            throw new InvalidSplit('The amounts add up to more than is due.');
        }
        if ($rest > 0) {
            $shares[] = new Share(null, $rest);
        }

        return new SplitResult($shares, 0);
    }

    /**
     * Each payer picks units of lines. A line's picks share its total by cumulative rounding,
     * so picks covering the whole line add up to exactly its total (thirds: 1167 + 1166 + 1167).
     *
     * @param  list<OrderLine>  $lines
     * @param  list<array{?string, list<Pick>}>  $payers  label, picks
     */
    public static function byUnits(int $amountCents, array $lines, array $payers): SplitResult
    {
        if ($payers === [] || count($payers) > self::MAX_PAYERS) {
            throw new InvalidSplit('Split between 1 and '.self::MAX_PAYERS.' payers.');
        }
        $byId = [];
        foreach ($lines as $line) {
            $byId[$line->id] = $line;
        }
        /** @var array<int, Fraction> $picked running total picked per line */
        $picked = [];
        $shares = [];
        foreach ($payers as [$label, $picks]) {
            $cents = 0;
            foreach ($picks as $pick) {
                $line = $byId[$pick->lineId] ?? throw new InvalidSplit("Line {$pick->lineId} is not in the order.");
                $unitCents = intdiv($line->totalCents(), $line->qty);
                $before = $picked[$pick->lineId] ?? null;
                $after = $before === null ? $pick->qty : $before->add($pick->qty);
                if ($after->exceeds($line->qty)) {
                    throw new InvalidSplit("More than {$line->qty} of line {$line->id} picked.");
                }
                $cents += $after->of($unitCents) - ($before?->of($unitCents) ?? 0);
                $picked[$pick->lineId] = $after;
            }
            $shares[] = new Share($label, $cents, $picks);
        }

        return new SplitResult($shares, $amountCents - array_sum(array_map(fn (Share $s) => $s->amountCents, $shares)));
    }

    /**
     * Whole lines per payer; a line goes to one payer at most.
     *
     * @param  list<OrderLine>  $lines
     * @param  list<array{?string, list<int>}>  $payers  label, line ids
     */
    public static function byGoods(int $amountCents, array $lines, array $payers): SplitResult
    {
        $qty = [];
        foreach ($lines as $line) {
            $qty[$line->id] = $line->qty;
        }
        $seen = [];
        $asUnits = [];
        foreach ($payers as [$label, $lineIds]) {
            $picks = [];
            foreach ($lineIds as $id) {
                if (isset($seen[$id])) {
                    throw new InvalidSplit("Line {$id} goes to more than one payer.");
                }
                $seen[$id] = true;
                $picks[] = new Pick($id, Fraction::whole($qty[$id] ?? throw new InvalidSplit("Line {$id} is not in the order.")));
            }
            $asUnits[] = [$label, $picks];
        }

        return self::byUnits($amountCents, $lines, $asUnits);
    }
}
