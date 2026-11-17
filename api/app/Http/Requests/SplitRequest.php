<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Split\Fraction;
use App\Domain\Split\Pick;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Split preview. `equal`: `n` payers. `amount`: `amounts` for the first payers, one more takes the rest.
 * `units`: `payers[].picks` of `{line_id, qty}` ("1", "0.5", "1/3"). `goods`: `payers[].line_ids`.
 */
final class SplitRequest extends FormRequest
{
    public const string QTY = 'regex:/^(\d{1,4}(\.\d{1,3})?|\d{1,4}\/\d{1,4})$/';

    private const string ID = 'max:999999999999999999';

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'mode' => ['required', 'string', 'in:equal,amount,units,goods'],
            'n' => ['required_if:mode,equal', 'integer', 'min:1', 'max:50'],
            'amounts' => ['required_if:mode,amount', 'list', 'min:1', 'max:49'],
            'amounts.*' => ['required', 'integer', 'min:1', 'max:100000000'],
            'payers' => ['required_if:mode,units,goods', 'list', 'min:1', 'max:50'],
            'payers.*' => ['required', 'array:label,picks,line_ids'],
            'payers.*.label' => ['nullable', 'string', 'max:255'],
            'payers.*.picks' => ['required_if:mode,units', 'list', 'max:200'],
            'payers.*.picks.*' => ['required', 'array:line_id,qty'],
            'payers.*.picks.*.line_id' => ['required', 'integer', 'min:1', self::ID],
            'payers.*.picks.*.qty' => ['required', self::QTY],
            'payers.*.line_ids' => ['required_if:mode,goods', 'list', 'max:200'],
            'payers.*.line_ids.*' => ['required', 'integer', 'min:1', self::ID],
        ];
    }

    /** @return list<int> */
    public function amounts(): array
    {
        /** @var list<int|string> $amounts */
        $amounts = $this->validated('amounts');

        return array_map(intval(...), $amounts);
    }

    /** @return list<array{?string, list<Pick>}> */
    public function unitPayers(): array
    {
        return array_map(fn (array $p) => [self::label($p), array_map(
            fn (array $pick) => new Pick((int) $pick['line_id'], Fraction::parse((string) $pick['qty'])),
            $p['picks'] ?? [],
        )], $this->payers());
    }

    /** @return list<array{?string, list<int>}> */
    public function goodsPayers(): array
    {
        return array_map(fn (array $p) => [self::label($p), array_map(intval(...), $p['line_ids'] ?? [])], $this->payers());
    }

    /** @return list<array{label?: ?string, picks?: list<array{line_id: int|string, qty: int|string}>, line_ids?: list<int|string>}> */
    private function payers(): array
    {
        /** @var list<array{label?: ?string, picks?: list<array{line_id: int|string, qty: int|string}>, line_ids?: list<int|string>}> $payers */
        $payers = $this->validated('payers');

        return $payers;
    }

    /** @param  array{label?: ?string}  $payer */
    private static function label(array $payer): ?string
    {
        $label = trim($payer['label'] ?? '');

        return $label === '' ? null : $label;
    }
}
