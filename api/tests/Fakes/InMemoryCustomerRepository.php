<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Customer\CustomerRepository;
use App\Domain\Customer\Customer;

final class InMemoryCustomerRepository implements CustomerRepository
{
    /** @var array<int, Customer> */
    public array $customers = [];

    public function find(int $id): ?Customer
    {
        return $this->customers[$id] ?? null;
    }

    public function findByPhone(string $phone): ?Customer
    {
        foreach ($this->customers as $c) {
            if ($c->phone === $phone) {
                return $c;
            }
        }

        return null;
    }

    public function search(?string $query, int $limit): array
    {
        $found = array_filter($this->customers, fn (Customer $c) => $query === null || stripos($c->name, $query) !== false);

        return array_slice(array_values($found), 0, $limit);
    }

    public function save(Customer $customer): ?Customer
    {
        if ($customer->id !== 0 && ! isset($this->customers[$customer->id])) {
            return null;
        }
        $id = $customer->id === 0 ? count($this->customers) + 1 : $customer->id;

        return $this->customers[$id] = new Customer($id, $customer->name, $customer->phone, $customer->addresses, $customer->note);
    }
}
