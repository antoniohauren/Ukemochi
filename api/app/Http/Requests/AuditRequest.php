<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `?entity=order&entity_id=42&before=1234`; `before` is the `next_before` of the previous page. */
final class AuditRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'entity' => ['nullable', 'string', 'max:50'],
            'entity_id' => ['nullable', 'string', 'max:50'],
            'before' => ['nullable', 'integer', 'min:1', 'max:999999999999999999'],
        ];
    }

    public function text(string $key): ?string
    {
        return $this->filled($key) ? $this->string($key)->toString() : null;
    }
}
