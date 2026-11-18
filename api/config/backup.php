<?php

declare(strict_types=1);

return [
    // pg_dump files, newest `keep` kept.
    'dir' => env('BACKUP_DIR', storage_path('app/backups')),
    'keep' => (int) env('BACKUP_KEEP', 14),
];
