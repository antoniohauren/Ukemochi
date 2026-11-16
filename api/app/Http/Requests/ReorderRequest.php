<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The full list of ids in the new order; the use case checks it is exactly the current set. */
final class ReorderRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'ids' => ['present', 'list', 'max:1000'],
            'ids.*' => ['required', 'integer', 'min:1', 'max:999999999999999999', 'distinct'],
        ];
    }

    /** @return list<int> */
    public function ids(): array
    {
        return array_values(array_map(fn (mixed $id): int => is_numeric($id) ? (int) $id : 0, $this->array('ids')));
    }
}
