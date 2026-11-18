<?php

declare(strict_types=1);

namespace App\Application\Backup;

final readonly class BackupFile
{
    public function __construct(public string $name, public int $sizeBytes, public \DateTimeImmutable $createdAt) {}
}
