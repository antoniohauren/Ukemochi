<?php

declare(strict_types=1);

namespace App\Application\Backup;

/** Where database dumps are written and kept. */
interface Backups
{
    /** Dumps the whole database to a new file named `name`. Throws when the dump fails; no partial file is kept. */
    public function dump(string $name): BackupFile;

    /** @return list<BackupFile> newest first */
    public function list(): array;

    public function delete(string $name): void;

    /** Absolute path of an existing backup, or null. */
    public function path(string $name): ?string;
}
