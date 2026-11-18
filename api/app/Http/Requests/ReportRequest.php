<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** `?from=…&to=…`: ISO 8601 instants with offset, the client's local day boundaries; `to` is exclusive, at most 366 days later. */
final class ReportRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $v): void {
            if ($v->errors()->isEmpty() && $this->instant('from')->modify('+366 days') < $this->instant('to')) {
                $v->errors()->add('to', 'The period is longer than 366 days.');
            }
        }];
    }

    public function instant(string $key): \DateTimeImmutable
    {
        return new \DateTimeImmutable($this->string($key)->toString());
    }
}
