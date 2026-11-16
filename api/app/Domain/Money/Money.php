<?php

declare(strict_types=1);

namespace App\Domain\Money;

/**
 * Amount in integer cents (BRL). Never stores or computes with floats.
 */
final readonly class Money
{
    private function __construct(public int $cents) {}

    public static function fromCents(int $cents): self
    {
        return new self($cents);
    }

    public static function zero(): self
    {
        return new self(0);
    }

    /**
     * Accepts "12,50", "12.50", "R$ 1.234,56", "1,234.56", "-3", "R$ -0,5".
     * With one separator kind: followed by exactly 3 digits it groups thousands,
     * by 1-2 digits it is the decimal mark. With both, the last one is decimal.
     */
    public static function parse(string $input): self
    {
        // shape: [-][R$][spaces][-]digits-and-separators, at most one "-", no inner whitespace
        $trimmed = preg_replace('/^[ \t\n\r\x{00A0}\x{202F}]+|[ \t\n\r\x{00A0}\x{202F}]+$/u', '', $input);
        if ($trimmed === null
            || preg_match('/^(-?)(?:R\$[ \x{00A0}\x{202F}]*)?(-?)(\d[\d.,]*)$/u', $trimmed, $parts) !== 1
            || ($parts[1] !== '' && $parts[2] !== '')) {
            throw InvalidMoney::unparsable();
        }
        $negative = $parts[1] !== '' || $parts[2] !== '';
        $s = $parts[3];

        [$decimal, $thousands] = self::separators($s);
        if ($decimal === null && $thousands === null) {
            $pattern = '/^(\d+)()$/';
        } else {
            $int = $thousands === null ? '\d+' : '(?:\d+|[1-9]\d{0,2}(?:'.preg_quote($thousands, '/').'\d{3})+)';
            $frac = $decimal === null ? '()' : '(?:'.preg_quote($decimal, '/').'(\d{1,2}))';
            $pattern = '/^('.$int.')'.$frac.'$/';
        }
        if (preg_match($pattern, $s, $m) !== 1) {
            throw InvalidMoney::unparsable();
        }

        $whole = ltrim(str_replace(['.', ','], '', $m[1]), '0');
        $fraction = (int) str_pad($m[2], 2, '0');
        if (strlen($whole) > 17 || (int) $whole > intdiv(PHP_INT_MAX - $fraction, 100)) {
            throw InvalidMoney::overflow();
        }
        $cents = (int) $whole * 100 + $fraction;

        return new self($negative ? -$cents : $cents);
    }

    public function add(self $other): self
    {
        return new self(self::checked($this->cents + $other->cents));
    }

    public function subtract(self $other): self
    {
        return new self(self::checked($this->cents - $other->cents));
    }

    public function times(int $qty): self
    {
        return new self(self::checked($this->cents * $qty));
    }

    /**
     * Multiplies by numerator/denominator, rounding half away from zero
     * (0.5 cent becomes 1 cent, -0.5 becomes -1).
     */
    public function timesFraction(int $numerator, int $denominator): self
    {
        if ($denominator <= 0) {
            throw InvalidMoney::invalidFraction();
        }
        $product = self::checked($this->cents * $numerator);
        $quotient = intdiv($product, $denominator);
        $remainder = abs($product % $denominator);
        if ($remainder >= $denominator - $remainder) {
            $quotient += $product < 0 ? -1 : 1;
        }

        return new self($quotient);
    }

    public function format(Locale $locale): string
    {
        $digits = str_pad(ltrim((string) $this->cents, '-'), 3, '0', STR_PAD_LEFT);
        [$group, $mark, $symbol] = match ($locale) {
            Locale::PtBR => ['.', ',', 'R$ '],
            Locale::En => [',', '.', 'R$'],
        };
        $whole = number_format((int) substr($digits, 0, -2), 0, '', $group);

        return ($this->cents < 0 ? '-' : '').$symbol.$whole.$mark.substr($digits, -2);
    }

    /**
     * @return array{0: ?string, 1: ?string} [decimal mark, thousands separator]
     */
    private static function separators(string $s): array
    {
        $lastDot = strrpos($s, '.');
        $lastComma = strrpos($s, ',');
        if ($lastDot !== false && $lastComma !== false) {
            return $lastDot > $lastComma ? ['.', ','] : [',', '.'];
        }
        $last = $lastDot !== false ? $lastDot : $lastComma;
        if ($last === false) {
            return [null, null];
        }
        $sep = $s[$last];
        $isThousands = substr_count($s, $sep) > 1 || strlen($s) - $last - 1 === 3;

        return $isThousands ? [null, $sep] : [$sep, null];
    }

    private static function checked(int|float $value): int
    {
        // int arithmetic that overflows silently becomes float in PHP
        if (! is_int($value)) {
            throw InvalidMoney::overflow();
        }

        return $value;
    }
}
