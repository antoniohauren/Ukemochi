<?php

declare(strict_types=1);

use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderType;
use App\Domain\Stock\InvalidStockQty;
use App\Domain\Stock\StockLevel;
use App\Domain\Stock\StockStatus;
use App\Domain\Stock\StockUsage;

function stockLevel(int $qty, ?int $min): StockLevel
{
    return new StockLevel(1, 'Coca', 'Zero', true, $min, $qty, 0);
}

it('reports out at zero or below, low at or below the minimum, ok otherwise', function (int $qty, ?int $min, StockStatus $status): void {
    expect(stockLevel($qty, $min)->status())->toBe($status);
})->with([
    [-2, 5, StockStatus::Out],
    [0, null, StockStatus::Out],
    [3, 5, StockStatus::Low],
    [5, 5, StockStatus::Low],
    [6, 5, StockStatus::Ok],
    [1, null, StockStatus::Ok],
]);

it('adjusts to a count by the signed difference, also from negative stock', function (): void {
    expect(stockLevel(3, null)->adjustTo(20))->toBe(17)
        ->and(stockLevel(-4, null)->adjustTo(0))->toBe(4)
        ->and(stockLevel(10, null)->adjustTo(8))->toBe(-2);
});

it('refuses a negative count', function (): void {
    stockLevel(3, null)->adjustTo(-1);
})->throws(InvalidStockQty::class);

it('sums units per variant and takes none for a cancelled order', function (): void {
    $order = Order::place(1, new OrderDetails(OrderType::DineIn, 'Ana'), [
        new OrderLine(1, 7, 'Coca', 'Zero', 600, 2, null),
        new OrderLine(2, 8, 'Guaraná', '', 600, 1, null),
        new OrderLine(3, 7, 'Coca', 'Zero', 600, 3, null),
    ], 1, new DateTimeImmutable);

    expect(StockUsage::of($order))->toBe([7 => 5, 8 => 1])
        ->and(StockUsage::of(null))->toBe([]);

    $order->cancel('desistiu');
    expect(StockUsage::of($order))->toBe([]);
});

it('computes the movement between two usages, leaving unchanged variants out', function (): void {
    expect(StockUsage::change([7 => 5, 8 => 1], [7 => 2, 8 => 1, 9 => 4]))->toBe([7 => 3, 9 => -4])
        ->and(StockUsage::change([], []))->toBe([]);
});
