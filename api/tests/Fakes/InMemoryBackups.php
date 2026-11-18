<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Backup\BackupFile;
use App\Application\Backup\Backups;

final class InMemoryBackups implements Backups
{
    /** @var array<string, BackupFile> */
    public array $files = [];

    public function dump(string $name): BackupFile
    {
        return $this->files[$name] = new BackupFile($name, 100, new \DateTimeImmutable('2026-11-16 12:00:00+00:00'));
    }

    public function list(): array
    {
        $files = $this->files;
        krsort($files);

        return array_values($files);
    }

    public function delete(string $name): void
    {
        unset($this->files[$name]);
    }

    public function path(string $name): ?string
    {
        return isset($this->files[$name]) ? "/backups/{$name}" : null;
    }
}
