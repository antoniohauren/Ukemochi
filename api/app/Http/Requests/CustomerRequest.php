<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use Illuminate\Foundation\Http\FormRequest;

/** Create (POST) and update (PUT): the whole profile, addresses replaced. */
final class CustomerRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'note' => ['nullable', 'string', 'max:1000'],
            'addresses' => ['present', 'list', 'max:20'],
            'addresses.*' => ['required', 'array:text,note'],
            'addresses.*.text' => ['required', 'string', 'max:1000'],
            'addresses.*.note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function customer(int $id = 0): Customer
    {
        /** @var list<array{text: string, note?: ?string}> $addresses */
        $addresses = $this->validated('addresses');

        return new Customer(
            $id,
            $this->string('name')->toString(),
            $this->filled('phone') ? $this->string('phone')->toString() : null,
            array_map(fn (array $a) => new Address($a['text'], $a['note'] ?? null), $addresses),
            $this->filled('note') ? $this->string('note')->toString() : null,
        );
    }
}
