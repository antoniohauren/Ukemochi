<?php

declare(strict_types=1);

namespace App\Application\Customer;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Order\OrderRepository;
use App\Application\Transaction;
use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerNotFound;
use App\Domain\Customer\PhoneTaken;
use App\Domain\Order\Order;

/** Customer profiles and their order history. Each write stores the customer and its audit row in one transaction. */
final readonly class ManageCustomers
{
    /** shortcut: lists stop at LIMIT rows, no paging; add paging if a search or history outgrows it. */
    private const int LIMIT = 50;

    public function __construct(
        private CustomerRepository $customers,
        private OrderRepository $orders,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
    ) {}

    /** @return list<Customer> */
    public function search(?string $query): array
    {
        return $this->customers->search($query, self::LIMIT);
    }

    public function get(int $id): Customer
    {
        return $this->customers->find($id) ?? throw new CustomerNotFound($id);
    }

    /**
     * Newest first.
     *
     * @return list<Order>
     */
    public function orders(int $id): array
    {
        $this->get($id);

        return $this->orders->listForCustomer($id, self::LIMIT);
    }

    public function create(Customer $customer): Customer
    {
        return $this->save($customer, 'create');
    }

    public function update(Customer $customer): Customer
    {
        return $this->save($customer, 'update');
    }

    private function save(Customer $customer, string $action): Customer
    {
        if ($customer->phone !== null) {
            $other = $this->customers->findByPhone($customer->phone);
            if ($other !== null && $other->id !== $customer->id) {
                throw new PhoneTaken;
            }
        }

        return $this->transaction->run(function () use ($customer, $action): Customer {
            $saved = $this->customers->save($customer) ?? throw new CustomerNotFound($customer->id);
            $this->audit->record($this->session->userId(), 'customer', $saved->id, $action, [
                'name' => $saved->name, 'phone' => $saved->phone, 'note' => $saved->note,
                'addresses' => array_map(fn (Address $a) => $a->text, $saved->addresses),
            ]);

            return $saved;
        });
    }
}
