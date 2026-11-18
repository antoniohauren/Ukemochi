<?php

declare(strict_types=1);

namespace App\Domain\Customer;

/** A saved customer; `phone` holds digits only and is the lookup key. Id 0 is not stored yet. */
final readonly class Customer
{
    public ?string $phone;

    /** @param  list<Address>  $addresses */
    public function __construct(
        public int $id,
        public string $name,
        ?string $phone,
        public array $addresses = [],
        public ?string $note = null,
    ) {
        if (trim($name) === '') {
            throw new NameRequired;
        }
        $this->phone = $phone === null ? null : self::normalizePhone($phone);
    }

    /** Keeps the digits: "(11) 98765-4321" is "11987654321". */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            throw new InvalidPhone;
        }

        return $digits;
    }
}
