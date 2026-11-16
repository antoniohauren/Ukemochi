<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    /** First admin from ADMIN_NAME / ADMIN_PIN. */
    public function run(): void
    {
        $this->command?->call('user:create-admin');
    }
}
