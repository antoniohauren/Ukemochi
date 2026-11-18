<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Application\Backup\BackupFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property list<BackupFile> $resource */
final class BackupListResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['backups' => array_map(fn (BackupFile $f) => [
            'name' => $f->name, 'size_bytes' => $f->sizeBytes, 'created_at' => $f->createdAt->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM),
        ], $this->resource)];
    }
}
