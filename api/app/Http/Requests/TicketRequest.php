<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Ticket\TicketKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class TicketRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'kind' => ['required', 'string', Rule::enum(TicketKind::class)],
        ];
    }

    public function kind(): TicketKind
    {
        return $this->enum('kind', TicketKind::class) ?? throw new \LogicException('validated');
    }
}
