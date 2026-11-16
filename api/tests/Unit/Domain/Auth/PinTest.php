<?php

declare(strict_types=1);

use App\Domain\Auth\InvalidPin;
use App\Domain\Auth\Pin;

it('accepts exactly four digits', function (): void {
    Pin::assertValid('0042');
})->throwsNoExceptions();

it('rejects anything but four digits', function (string $pin): void {
    Pin::assertValid($pin);
})->with(['', '123', '12345', '12a4', ' 1234', '١٢٣٤'])->throws(InvalidPin::class);

it('rejects four digits followed by a newline', function (): void {
    Pin::assertValid("1234\n");
})->throws(InvalidPin::class);
