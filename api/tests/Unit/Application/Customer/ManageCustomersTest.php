<?php

declare(strict_types=1);

use App\Application\Customer\ManageCustomers;
use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerNotFound;
use App\Domain\Customer\PhoneTaken;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryCustomerRepository;
use Tests\Fakes\InMemoryOrderRepository;
use Tests\Fakes\InMemorySessionAuth;

/** @return array{ManageCustomers, InMemoryCustomerRepository, InMemoryAuditLog} */
function manageCustomers(): array
{
    $customers = new InMemoryCustomerRepository;
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(7);

    return [new ManageCustomers($customers, new InMemoryOrderRepository, new ImmediateTransaction, $audit, $session), $customers, $audit];
}

it('creates a customer and audits the profile', function (): void {
    [$manage, $customers, $audit] = manageCustomers();
    $c = $manage->create(new Customer(0, 'Ana', '11 9999-8888', [new Address('Rua A, 1', 'portão azul')], 'VIP'));

    expect($customers->find($c->id))->toEqual($c)
        ->and($audit->entries)->toBe([[
            'userId' => 7, 'entity' => 'customer', 'entityId' => 1, 'action' => 'create',
            'summary' => ['name' => 'Ana', 'phone' => '1199998888', 'note' => 'VIP', 'addresses' => ['Rua A, 1']], 'note' => null,
        ]]);
});

it('rejects a phone another customer has', function (): void {
    [$manage] = manageCustomers();
    $manage->create(new Customer(0, 'Ana', '11999998888'));

    expect(fn () => $manage->create(new Customer(0, 'Bia', '(11) 99999-8888')))->toThrow(PhoneTaken::class);
});

it('keeps its own phone on update', function (): void {
    [$manage, , $audit] = manageCustomers();
    $c = $manage->create(new Customer(0, 'Ana', '11999998888'));
    $manage->update(new Customer($c->id, 'Ana Maria', '11999998888'));

    expect($manage->get($c->id)->name)->toBe('Ana Maria')
        ->and($audit->entries[1]['action'])->toBe('update');
});

it('fails to update or read a missing customer', function (): void {
    [$manage] = manageCustomers();

    expect(fn () => $manage->update(new Customer(9, 'Ana', null)))->toThrow(CustomerNotFound::class)
        ->and(fn () => $manage->get(9))->toThrow(CustomerNotFound::class)
        ->and(fn () => $manage->orders(9))->toThrow(CustomerNotFound::class);
});
