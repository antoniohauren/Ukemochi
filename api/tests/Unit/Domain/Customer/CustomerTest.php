<?php

declare(strict_types=1);

use App\Domain\Customer\Address;
use App\Domain\Customer\AddressRequired;
use App\Domain\Customer\Customer;
use App\Domain\Customer\InvalidPhone;
use App\Domain\Customer\NameRequired;

it('keeps only the digits of the phone', function (): void {
    expect((new Customer(0, 'Ana', '(11) 98765-4321'))->phone)->toBe('11987654321')
        ->and((new Customer(0, 'Ana', null))->phone)->toBeNull();
});

it('rejects phones shorter than 8 or longer than 15 digits', function (string $phone): void {
    expect(fn () => new Customer(0, 'Ana', $phone))->toThrow(InvalidPhone::class);
})->with(['1234567', '1234567890123456', 'abc', '']);

it('accepts 8 and 15 digit phones', function (string $phone): void {
    expect((new Customer(0, 'Ana', $phone))->phone)->toBe($phone);
})->with(['12345678', '123456789012345']);

it('needs a name', function (): void {
    expect(fn () => new Customer(0, '  ', null))->toThrow(NameRequired::class);
});

it('needs address text', function (): void {
    expect(fn () => new Address(' '))->toThrow(AddressRequired::class);
});
