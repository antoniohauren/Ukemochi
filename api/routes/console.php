<?php

declare(strict_types=1);

use App\Application\Backup\ManageBackups;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('backup:run', function (ManageBackups $backups): void {
    $this->info($backups->run('daily')->name);
})->purpose('Dump the database and keep the newest backups');

// Shift close also backs up (ShiftController); this covers days without a close.
Schedule::command('backup:run')->daily();
