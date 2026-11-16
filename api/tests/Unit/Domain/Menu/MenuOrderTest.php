<?php

declare(strict_types=1);

use App\Domain\Menu\InvalidOrder;
use App\Domain\Menu\MenuOrder;

it('gives each id its position as sort', function (): void {
    expect(MenuOrder::sorts([3, 1, 2], [1, 2, 3]))->toBe([3 => 0, 1 => 1, 2 => 2]);
});

it('accepts an empty order of nothing', function (): void {
    expect(MenuOrder::sorts([], []))->toBe([]);
});

it('refuses an order that is not exactly the current ids', function (): void {
    $cases = [
        'missing one' => [1, 2],
        'an extra one' => [1, 2, 3, 4],
        'a duplicate' => [1, 2, 2],
        'a duplicate hiding a missing one' => [1, 1, 3],
        'a stranger' => [1, 2, 9],
    ];
    foreach ($cases as $case => $ids) {
        expect(fn () => MenuOrder::sorts($ids, [1, 2, 3]))->toThrow(InvalidOrder::class, null, $case);
    }
});
