<?php

declare(strict_types=1);

use App\Domain\Menu\Addon;
use App\Domain\Menu\InvalidAddonTarget;
use App\Domain\Menu\InvalidPrice;
use App\Domain\Menu\Variant;

it('allows a free variant', function (): void {
    expect((new Variant(0, 1, '', 0, true, 0))->priceCents)->toBe(0);
});

it('rejects a negative variant price', function (): void {
    new Variant(0, 1, '', -1, true, 0);
})->throws(InvalidPrice::class);

it('rejects a negative add-on price', function (): void {
    new Addon(0, 1, null, 'Cream cheese', -1, true);
})->throws(InvalidPrice::class);

it('ties an add-on to an item or to a category', function (?int $itemId, ?int $categoryId): void {
    expect((new Addon(0, $itemId, $categoryId, 'Cream cheese', 300, true))->name)->toBe('Cream cheese');
})->with([[1, null], [null, 1]]);

it('rejects an add-on with both or neither target', function (?int $itemId, ?int $categoryId): void {
    new Addon(0, $itemId, $categoryId, 'Cream cheese', 300, true);
})->with([[1, 1], [null, null]])->throws(InvalidAddonTarget::class);
