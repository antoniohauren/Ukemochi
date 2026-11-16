<?php

declare(strict_types=1);

namespace App\Infrastructure;

use App\Application\Transaction;
use Illuminate\Database\ConnectionInterface;

final readonly class DatabaseTransaction implements Transaction
{
    public function __construct(private ConnectionInterface $db) {}

    public function run(\Closure $work): mixed
    {
        return $this->db->transaction($work);
    }
}
