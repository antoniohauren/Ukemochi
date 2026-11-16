<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'pin' => ['required', 'string', 'regex:/^\d{4}\z/'],
        ];
    }

    public function name(): string
    {
        return $this->string('name')->toString();
    }

    public function pin(): string
    {
        return $this->string('pin')->toString();
    }
}
