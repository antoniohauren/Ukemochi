<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Backup\ManageBackups;
use App\Http\Resources\BackupListResource;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final readonly class BackupController
{
    public function __construct(private ManageBackups $backups) {}

    public function index(): BackupListResource
    {
        return new BackupListResource($this->backups->list());
    }

    /** `name` is checked against the backup name pattern by the route and the use case. */
    public function download(string $name): BinaryFileResponse
    {
        return response()->download($this->backups->path($name), $name, ['Content-Type' => 'application/octet-stream']);
    }
}
