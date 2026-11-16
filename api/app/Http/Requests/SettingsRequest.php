<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Money\Locale;
use App\Domain\Settings\PaperWidth;
use App\Domain\Settings\Settings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SettingsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'restaurant_name' => ['required', 'string', 'max:255'],
            'language' => ['required', 'string', Rule::enum(Locale::class)],
            'paper_width' => ['required', 'integer', Rule::enum(PaperWidth::class)],
            'delivery_fee_enabled' => ['required', 'boolean'],
            'delivery_fee_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
        ];
    }

    public function settings(): Settings
    {
        return new Settings(
            $this->string('restaurant_name')->toString(),
            $this->enum('language', Locale::class) ?? throw new \LogicException('validated'),
            PaperWidth::from($this->integer('paper_width')),
            $this->boolean('delivery_fee_enabled'),
            $this->integer('delivery_fee_cents'),
        );
    }
}
