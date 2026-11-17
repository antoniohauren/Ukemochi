<?php

declare(strict_types=1);

namespace App\Domain\Split;

/** Positive quantity of a line, exact: "2", "0.5" or "1/3". Always reduced. */
final readonly class Fraction implements \Stringable
{
    public int $num;

    public int $den;

    public function __construct(int $num, int $den)
    {
        if ($num <= 0 || $den <= 0) {
            throw new InvalidSplit('A quantity must be above zero.');
        }
        $gcd = self::gcd($num, $den);
        $this->num = intdiv($num, $gcd);
        $this->den = intdiv($den, $gcd);
    }

    public static function parse(string $qty): self
    {
        if (preg_match('/^(\d{1,4})\/(\d{1,4})$/', $qty, $m) === 1) {
            return new self((int) $m[1], (int) $m[2]);
        }
        if (preg_match('/^(\d{1,4})(?:\.(\d{1,3}))?$/', $qty, $m) === 1) {
            $decimals = $m[2] ?? '';

            return new self((int) ($m[1].$decimals), 10 ** strlen($decimals));
        }
        throw new InvalidSplit("Invalid quantity \"{$qty}\".");
    }

    public static function whole(int $qty): self
    {
        return new self($qty, 1);
    }

    public function add(self $other): self
    {
        return new self($this->num * $other->den + $other->num * $this->den, $this->den * $other->den);
    }

    public function exceeds(int $qty): bool
    {
        return $this->num > $qty * $this->den;
    }

    /** `cents` × this fraction, rounded half up. */
    public function of(int $cents): int
    {
        return intdiv(2 * $cents * $this->num + $this->den, 2 * $this->den);
    }

    public function __toString(): string
    {
        return $this->den === 1 ? (string) $this->num : "{$this->num}/{$this->den}";
    }

    private static function gcd(int $a, int $b): int
    {
        return $b === 0 ? $a : self::gcd($b, $a % $b);
    }
}
