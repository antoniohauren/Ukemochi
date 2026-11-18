<?php

declare(strict_types=1);

namespace App\Domain\Backup;

use App\Domain\DomainException;

final class BackupNotFound extends DomainException
{
    public function __construct(string $name)
    {
        parent::__construct('backup.not_found', "No backup named {$name}.");
    }
}
