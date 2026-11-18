<?php

declare(strict_types=1);

namespace App\Infrastructure\Backup;

use App\Application\Backup\BackupFile;
use App\Application\Backup\Backups;
use Illuminate\Process\Factory;

/** `pg_dump -Fc` files in one directory (restore with `pg_restore`). */
final readonly class PgDumpBackups implements Backups
{
    /** @param  array{host: string, port: int|string, database: string, username: string, password: string}  $db */
    public function __construct(private Factory $process, private string $dir, private array $db) {}

    public function dump(string $name): BackupFile
    {
        if (! is_dir($this->dir) && ! mkdir($this->dir, 0o700, true) && ! is_dir($this->dir)) {
            throw new \RuntimeException("Cannot create {$this->dir}.");
        }
        $tmp = "{$this->dir}/.{$name}.part";
        $result = $this->process->newPendingProcess()->env(['PGPASSWORD' => $this->db['password']])->timeout(600)->run([
            'pg_dump', '--format=custom', '--no-password',
            '--host='.$this->db['host'], '--port='.$this->db['port'], '--username='.$this->db['username'],
            '--dbname='.$this->db['database'], '--file='.$tmp,
        ]);
        if (! $result->successful()) {
            @unlink($tmp);
            throw new \RuntimeException('pg_dump failed: '.trim($result->errorOutput()));
        }
        // Rename last, so a half-written dump is never listed.
        rename($tmp, "{$this->dir}/{$name}");

        return $this->file($name);
    }

    public function list(): array
    {
        $names = array_map('basename', glob("{$this->dir}/ukemochi-*.dump") ?: []);
        rsort($names);

        return array_map($this->file(...), $names);
    }

    public function delete(string $name): void
    {
        @unlink("{$this->dir}/{$name}");
    }

    public function path(string $name): ?string
    {
        $path = "{$this->dir}/".basename($name);

        return is_file($path) ? $path : null;
    }

    private function file(string $name): BackupFile
    {
        $path = "{$this->dir}/{$name}";
        clearstatcache(true, $path);

        return new BackupFile($name, (int) filesize($path), (new \DateTimeImmutable)->setTimestamp((int) filemtime($path)));
    }
}
