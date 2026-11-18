<?php

declare(strict_types=1);

namespace App\Infrastructure\Customer;

use App\Application\Customer\CustomerRepository;
use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use App\Domain\Customer\PhoneTaken;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\UniqueConstraintViolationException;

final readonly class DatabaseCustomerRepository implements CustomerRepository
{
    public function __construct(private ConnectionInterface $db) {}

    public function find(int $id): ?Customer
    {
        return $this->hydrate($this->db->table('customers')->where('id', $id)->get())[0] ?? null;
    }

    public function findByPhone(string $phone): ?Customer
    {
        return $this->hydrate($this->db->table('customers')->where('phone', $phone)->get())[0] ?? null;
    }

    public function search(?string $query, int $limit): array
    {
        $q = $this->db->table('customers');
        if ($query !== null) {
            $like = '%'.addcslashes($query, '\\%_').'%';
            $digits = preg_replace('/\D/', '', $query) ?? '';
            $q->where(function (Builder $w) use ($like, $digits): void {
                $w->where('name', 'ilike', $like);
                if ($digits !== '') {
                    $w->orWhere('phone', 'like', '%'.$digits.'%');
                }
            });
        }

        return $this->hydrate($q->orderByRaw('lower(name)')->orderBy('id')->limit($limit)->get());
    }

    public function save(Customer $customer): ?Customer
    {
        $row = ['name' => $customer->name, 'phone' => $customer->phone, 'note' => $customer->note, 'updated_at' => now()];
        try {
            if ($customer->id === 0) {
                $id = (int) $this->db->table('customers')->insertGetId([...$row, 'created_at' => now()]);
            } else {
                $id = $customer->id;
                if ($this->db->table('customers')->where('id', $id)->update($row) === 0) {
                    return null;
                }
            }
        } catch (UniqueConstraintViolationException) {
            throw new PhoneTaken;
        }

        // Orders keep their own address text, so the addresses can be replaced.
        $this->db->table('addresses')->where('customer_id', $id)->delete();
        $this->db->table('addresses')->insert(array_map(
            fn (Address $a) => ['customer_id' => $id, 'text' => $a->text, 'note' => $a->note], $customer->addresses,
        ));

        return $this->find($id);
    }

    /**
     * @param  iterable<mixed>  $rows
     * @return list<Customer>
     */
    private function hydrate(iterable $rows): array
    {
        /** @var list<object{id: int, name: string, phone: ?string, note: ?string}> $rows */
        $rows = [...$rows];
        $addresses = [];
        foreach ($this->db->table('addresses')->whereIn('customer_id', array_map(fn (object $r) => $r->id, $rows))->orderBy('id')->get() as $a) {
            /** @var object{customer_id: int, text: string, note: ?string} $a */
            $addresses[$a->customer_id][] = new Address($a->text, $a->note);
        }

        return array_map(fn (object $r) => new Customer($r->id, $r->name, $r->phone, $addresses[$r->id] ?? [], $r->note), $rows);
    }
}
