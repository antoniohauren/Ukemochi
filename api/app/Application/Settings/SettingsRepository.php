<?php

declare(strict_types=1);

namespace App\Application\Settings;

use App\Domain\Settings\Settings;

interface SettingsRepository
{
    /** Stored values, with the defaults for keys never saved. */
    public function get(): Settings;

    public function save(Settings $settings): void;
}
