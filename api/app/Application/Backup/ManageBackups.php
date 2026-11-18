<?php

declare(strict_types=1);

namespace App\Application\Backup;

use App\Application\Audit\AuditLog;
use App\Application\Clock;
use App\Domain\Backup\BackupNotFound;

/** Runs a backup (on shift close and daily), keeping the newest `keep`; lists and finds them for download. */
final readonly class ManageBackups
{
    public const string NAME = '/^ukemochi-\d{8}-\d{6}\.dump$/';

    public function __construct(private Backups $backups, private Clock $clock, private AuditLog $audit, private int $keep) {}

    /** @param  'shift_close'|'daily'  $reason */
    public function run(string $reason): BackupFile
    {
        $file = $this->backups->dump('ukemochi-'.$this->clock->now()->format('Ymd-His').'.dump');
        $old = array_slice($this->backups->list(), max(1, $this->keep));
        foreach ($old as $o) {
            $this->backups->delete($o->name);
        }
        $this->audit->record(null, 'backup', $file->name, 'run', [
            'reason' => $reason, 'size_bytes' => $file->sizeBytes, 'deleted' => array_map(fn (BackupFile $o) => $o->name, $old),
        ]);

        return $file;
    }

    /** @return list<BackupFile> newest first */
    public function list(): array
    {
        return $this->backups->list();
    }

    public function path(string $name): string
    {
        return (preg_match(self::NAME, $name) === 1 ? $this->backups->path($name) : null) ?? throw new BackupNotFound($name);
    }
}
