<?php

declare(strict_types=1);

namespace App\Infrastructure\Health;

use App\Application\Health\DatabaseProbe;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\QueryException;

final readonly class ConnectionDatabaseProbe implements DatabaseProbe
{
    public function __construct(private ConnectionInterface $db) {}

    public function isUp(): bool
    {
        try {
            $this->db->select('select 1');

            return true;
        } catch (QueryException|\PDOException) {
            return false;
        }
    }
}
