<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Auth\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create (POST, with a PIN) and update (PUT, PIN changes only through reset). */
final class StaffRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::enum(Role::class)],
            'active' => ['required', 'boolean'],
            ...($this->isMethod('POST') ? ['pin' => ['required', 'string', 'regex:/^\d{4}\z/']] : []),
        ];
    }

    public function role(): Role
    {
        return $this->enum('role', Role::class) ?? throw new \LogicException('validated');
    }
}
