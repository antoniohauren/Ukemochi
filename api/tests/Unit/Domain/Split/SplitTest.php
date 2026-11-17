<?php

declare(strict_types=1);

use App\Domain\Order\LineAddon;
use App\Domain\Order\OrderLine;
use App\Domain\Split\Fraction;
use App\Domain\Split\InvalidSplit;
use App\Domain\Split\Pick;
use App\Domain\Split\Share;
use App\Domain\Split\Split;

/**
 * Line 1: 2 × R$32 + R$3 add-on (R$35 a unit). Line 2: 1 × R$10.
 *
 * @return list<OrderLine>
 */
function splitLines(): array
{
    return [
        new OrderLine(1, 100, 'Philadelphia', 'Inteiro', 3200, 2, null, [new LineAddon(1, 'Cream cheese', 300)]),
        new OrderLine(2, 101, 'Coca', 'Lata', 1000, 1, null, []),
    ];
}

/**
 * @param  list<Share>  $shares
 * @return list<int>
 */
function amounts(array $shares): array
{
    return array_map(fn (Share $s) => $s->amountCents, $shares);
}

it('parses whole, decimal and n/d quantities', function (): void {
    expect((string) Fraction::parse('2'))->toBe('2')
        ->and((string) Fraction::parse('0.5'))->toBe('1/2')
        ->and((string) Fraction::parse('2/6'))->toBe('1/3')
        ->and((string) Fraction::parse('1.25'))->toBe('5/4')
        ->and(fn () => Fraction::parse('0'))->toThrow(InvalidSplit::class)
        ->and(fn () => Fraction::parse('1/0'))->toThrow(InvalidSplit::class)
        ->and(fn () => Fraction::parse('abc'))->toThrow(InvalidSplit::class);
});

it('splits equally, remainder cents to the first payers', function (): void {
    $result = Split::equal(10000, 3);

    expect(amounts($result->shares))->toBe([3334, 3333, 3333])
        ->and($result->remainderCents)->toBe(0)
        ->and(fn () => Split::equal(100, 0))->toThrow(InvalidSplit::class);
});

it('splits by free amounts, the last payer taking the rest', function (): void {
    $result = Split::byAmount(10000, [2500, 4000]);

    expect(amounts($result->shares))->toBe([2500, 4000, 3500])
        ->and($result->remainderCents)->toBe(0)
        ->and(fn () => Split::byAmount(10000, [6000, 5000]))->toThrow(InvalidSplit::class)
        ->and(fn () => Split::byAmount(10000, [0]))->toThrow(InvalidSplit::class);
});

it('splits by item units, fractions summing to the line total', function (): void {
    $third = Fraction::parse('1/3');
    $result = Split::byUnits(8000, splitLines(), [
        ['Ana', [new Pick(1, Fraction::parse('1')), new Pick(1, $third)]],
        ['Bia', [new Pick(1, $third)]],
        ['Caio', [new Pick(1, $third), new Pick(2, Fraction::parse('1'))]],
    ]);

    // R$35 / 3 = 1166.67 → 1167, 1166, 1167 by cumulative rounding: the thirds add up to exactly R$35.
    expect(amounts($result->shares))->toBe([3500 + 1167, 1166, 1167 + 1000])
        ->and($result->remainderCents)->toBe(8000 - 8000)
        ->and($result->shares[0]->payerLabel)->toBe('Ana')
        ->and(array_map(fn (Pick $p) => [$p->lineId, (string) $p->qty], $result->shares[0]->picks))->toBe([[1, '1'], [1, '1/3']]);
});

it('keeps what nobody picked as the remainder, delivery fee included', function (): void {
    $result = Split::byUnits(8700, splitLines(), [['Ana', [new Pick(1, Fraction::parse('0.5'))]]]);

    expect(amounts($result->shares))->toBe([1750])
        ->and($result->remainderCents)->toBe(6950);
});

it('refuses picking more than the line has, or a line not in the order', function (): void {
    expect(fn () => Split::byUnits(8000, splitLines(), [
        ['Ana', [new Pick(1, Fraction::parse('1.5'))]], ['Bia', [new Pick(1, Fraction::parse('1'))]],
    ]))->toThrow(InvalidSplit::class)
        ->and(fn () => Split::byUnits(8000, splitLines(), [['Ana', [new Pick(9, Fraction::parse('1'))]]]))->toThrow(InvalidSplit::class);
});

it('splits by consumed lines, each line to one payer', function (): void {
    $result = Split::byGoods(8000, splitLines(), [['Ana', [1]], ['Bia', [2]]]);

    expect(amounts($result->shares))->toBe([7000, 1000])
        ->and((string) $result->shares[0]->picks[0]->qty)->toBe('2')
        ->and(fn () => Split::byGoods(8000, splitLines(), [['Ana', [1]], ['Bia', [1]]]))->toThrow(InvalidSplit::class);
});
