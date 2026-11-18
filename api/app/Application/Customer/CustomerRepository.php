<?php

declare(strict_types=1);

namespace App\Application\Customer;

use App\Domain\Customer\Customer;
use App\Domain\Customer\PhoneTaken;

interface CustomerRepository
{
    public function find(int $id): ?Customer;

    public function findByPhone(string $phone): ?Customer;

    /**
     * By name (any part, any case) or phone digits, by name; all when `$query` is null.
     *
     * @return list<Customer>
     */
    public function search(?string $query, int $limit): array;

    /**
     * Inserts (id 0) or updates the customer and replaces its addresses; null when the id does not exist.
     *
     * @throws PhoneTaken
     */
    public function save(Customer $customer): ?Customer;
}
