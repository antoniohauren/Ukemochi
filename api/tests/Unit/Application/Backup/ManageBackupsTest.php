<?php

declare(strict_types=1);

use App\Application\Backup\ManageBackups;
use App\Domain\Backup\BackupNotFound;
use Tests\Fakes\FixedClock;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryBackups;

it('names the dump by time, keeps the newest N and audits the run', function (): void {
    $backups = new InMemoryBackups;
    foreach (['ukemochi-20261113-120000.dump', 'ukemochi-20261114-120000.dump', 'ukemochi-20261115-120000.dump'] as $n) {
        $backups->dump($n);
    }
    $audit = new InMemoryAuditLog;

    $file = (new ManageBackups($backups, new FixedClock, $audit, 2))->run('shift_close');

    expect($file->name)->toBe('ukemochi-20261116-120000.dump')
        ->and(array_keys($backups->files))->toBe(['ukemochi-20261115-120000.dump', 'ukemochi-20261116-120000.dump'])
        ->and($audit->entries[0])->toMatchArray(['userId' => null, 'entity' => 'backup', 'entityId' => 'ukemochi-20261116-120000.dump', 'action' => 'run', 'summary' => [
            'reason' => 'shift_close', 'size_bytes' => 100, 'deleted' => ['ukemochi-20261114-120000.dump', 'ukemochi-20261113-120000.dump'],
        ]]);
});

it('never deletes the dump it just made, even with keep 0', function (): void {
    $backups = new InMemoryBackups;
    (new ManageBackups($backups, new FixedClock, new InMemoryAuditLog, 0))->run('daily');

    expect($backups->files)->toHaveCount(1);
});

it('finds only well-formed names', function (string $name): void {
    $backups = new InMemoryBackups;
    $backups->files[$name] = $backups->dump('x');
    (new ManageBackups($backups, new FixedClock, new InMemoryAuditLog, 2))->path($name);
})->with(['../.env', 'ukemochi-1.dump', 'ukemochi-20261116-120000.dump.bak'])->throws(BackupNotFound::class);
