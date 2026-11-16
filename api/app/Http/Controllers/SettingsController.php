<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Settings\ManageSettings;
use App\Http\Requests\SettingsRequest;
use App\Http\Resources\SettingsResource;

final readonly class SettingsController
{
    public function __construct(private ManageSettings $settings) {}

    public function show(): SettingsResource
    {
        return new SettingsResource($this->settings->get());
    }

    public function update(SettingsRequest $r): SettingsResource
    {
        return new SettingsResource($this->settings->update($r->settings()));
    }
}
