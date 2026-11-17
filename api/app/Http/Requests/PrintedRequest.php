<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Ticket\TicketKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `version` is the one the printed ticket showed; the domain refuses one the order never had. */
final class PrintedRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'kind' => ['required', 'string', Rule::enum(TicketKind::class)],
            'version' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function kind(): TicketKind
    {
        return $this->enum('kind', TicketKind::class) ?? throw new \LogicException('validated');
    }
}
