<?php

declare(strict_types=1);

use App\Domain\DomainException;
use App\Domain\Money\InvalidMoney;
use App\Domain\Money\Locale;
use App\Domain\Money\Money;

function invalidCode(callable $fn): ?string
{
    try {
        $fn();
    } catch (InvalidMoney $e) {
        return $e->errorCode;
    }

    return null;
}

it('parses user input into cents', function (string $input, int $cents): void {
    expect(Money::parse($input)->cents)->toBe($cents);
})->with([
    ['12,50', 1250],
    ['12.50', 1250],
    ['12,5', 1250],
    ['12', 1200],
    ['0,99', 99],
    ['R$ 1.234,56', 123456],
    ['R$1,234.56', 123456],
    ["R\$\u{00A0}1.234,56", 123456],
    ['1.234.567,89', 123456789],
    ['1,234,567.89', 123456789],
    ['1.234', 123400],
    ['1,234', 123400],
    ['1.000.000', 100000000],
    ['  7  ', 700],
    ['-3,25', -325],
    ['-R$ 3,25', -325],
    ['R$ -3,25', -325],
    ['007,10', 710],
    ['0', 0],
    ['-0', 0],
    ["\u{00A0}12,50\u{202F}", 1250],
    ["\t12\n", 1200],
]);

it('rejects invalid strings with a typed domain error', function (string $input): void {
    expect(invalidCode(fn () => Money::parse($input)))->toBe('money.invalid');
})->with([
    [''],
    ['   '],
    ['R$'],
    ['-'],
    ['abc'],
    ['12a'],
    ['1e3'],
    ['--1'],
    ['12,345,6'],
    ['1.2.3'],
    ['12,'],
    ['12.'],
    [',50'],
    ['1,23,456'],
    ['12.50,3'],
    ['0,005'],
    ['1.234,567'],
    ['+5'],
    ['12 50'],
    ['12R$50'],
    ["1\t000"],
    ['12,50 R$'],
    ['-R$ -3'],
    ['R$ 1 000'],
]);

it('keeps raw input out of the error message', function (): void {
    try {
        Money::parse(str_repeat('x', 100));
    } catch (InvalidMoney $e) {
        expect($e->getMessage())->not->toContain('x');
    }
});

it('reports invalid input as a DomainException subclass', function (): void {
    expect(fn () => Money::parse('x'))->toThrow(DomainException::class);
});

it('guards against overflow when parsing', function (): void {
    expect(invalidCode(fn () => Money::parse('999999999999999999999')))->toBe('money.overflow')
        ->and(invalidCode(fn () => Money::parse('92233720368547758,08')))->toBe('money.overflow')
        ->and(Money::parse('92233720368547758,07')->cents)->toBe(PHP_INT_MAX);
});

it('adds and subtracts, allowing negatives', function (): void {
    $a = Money::fromCents(1050);

    expect($a->add(Money::fromCents(250))->cents)->toBe(1300)
        ->and($a->subtract(Money::fromCents(2000))->cents)->toBe(-950)
        ->and(Money::zero()->cents)->toBe(0);
});

it('multiplies by integer quantity', function (): void {
    expect(Money::fromCents(1250)->times(3)->cents)->toBe(3750)
        ->and(Money::fromCents(1250)->times(0)->cents)->toBe(0)
        ->and(Money::fromCents(1250)->times(-2)->cents)->toBe(-2500);
});

it('multiplies by a fraction rounding half away from zero', function (int $cents, int $num, int $den, int $expected): void {
    expect(Money::fromCents($cents)->timesFraction($num, $den)->cents)->toBe($expected);
})->with([
    [1000, 1, 2, 500],
    [1001, 1, 2, 501],
    [-1001, 1, 2, -501],
    [1000, 1, 3, 333],
    [1000, 2, 3, 667],
    [-1000, 2, 3, -667],
    [1, 1, 3, 0],
    [1, 1, 2, 1],
    [999, 3, 4, 749],
    [1250, 3, 2, 1875],
]);

it('rejects a non-positive fraction denominator', function (int $den): void {
    expect(invalidCode(fn () => Money::fromCents(100)->timesFraction(1, $den)))->toBe('money.invalid_fraction');
})->with([[0], [-2]]);

it('guards against arithmetic overflow', function (): void {
    $max = Money::fromCents(PHP_INT_MAX);

    expect(invalidCode(fn () => $max->add(Money::fromCents(1))))->toBe('money.overflow')
        ->and(invalidCode(fn () => Money::fromCents(PHP_INT_MIN)->subtract(Money::fromCents(1))))->toBe('money.overflow')
        ->and(invalidCode(fn () => $max->times(2)))->toBe('money.overflow')
        ->and(invalidCode(fn () => $max->timesFraction(3, 2)))->toBe('money.overflow');
});

it('formats for pt-BR and en', function (int $cents, string $ptBR, string $en): void {
    $m = Money::fromCents($cents);

    expect($m->format(Locale::PtBR))->toBe($ptBR)
        ->and($m->format(Locale::En))->toBe($en);
})->with([
    [0, 'R$ 0,00', 'R$0.00'],
    [5, 'R$ 0,05', 'R$0.05'],
    [1250, 'R$ 12,50', 'R$12.50'],
    [123456789, 'R$ 1.234.567,89', 'R$1,234,567.89'],
    [-325, '-R$ 3,25', '-R$3.25'],
    [-5, '-R$ 0,05', '-R$0.05'],
]);

it('round-trips format and parse', function (int $cents): void {
    $m = Money::fromCents($cents);

    expect(Money::parse($m->format(Locale::PtBR))->cents)->toBe($cents)
        ->and(Money::parse($m->format(Locale::En))->cents)->toBe($cents);
})->with([[0], [1], [99], [100000], [-123456]]);
