<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ListCustomersRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['q' => ['nullable', 'string', 'max:255']];
    }

    public function term(): ?string
    {
        return $this->filled('q') ? trim($this->string('q')->toString()) : null;
    }
}
