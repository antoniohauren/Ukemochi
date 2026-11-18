<?php

declare(strict_types=1);

namespace App\Domain\Customer;

final readonly class Address
{
    public function __construct(public string $text, public ?string $note = null)
    {
        if (trim($text) === '') {
            throw new AddressRequired;
        }
    }
}
