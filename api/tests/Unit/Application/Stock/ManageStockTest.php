<?php

declare(strict_types=1);

use App\Application\Stock\ManageStock;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Stock\InvalidStockQty;
use App\Domain\Stock\MovementKind;
use Tests\Fakes\FixedClock;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemorySessionAuth;
use Tests\Fakes\InMemoryStockRepository;

/** @return array{ManageStock, InMemoryStockRepository, InMemoryAuditLog, InMemorySessionAuth} */
function manageStock(): array
{
    $stock = new InMemoryStockRepository;
    $stock->variants[5] = ['name' => 'Coca', 'track' => false, 'min' => null];
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(7);

    return [new ManageStock($stock, new ImmediateTransaction, $audit, $session, new FixedClock), $stock, $audit, $session];
}

it('turns tracking on with a minimum and audits it', function (): void {
    [$manage, , $audit] = manageStock();

    $level = $manage->configure(5, true, 5, 'geladeira');

    expect($level->tracked)->toBeTrue()->and($level->min)->toBe(5)
        ->and($audit->entries)->toBe([[
            'userId' => 7, 'entity' => 'variant', 'entityId' => 5, 'action' => 'stock_configure',
            'summary' => ['track_stock' => true, 'stock_min' => 5], 'note' => 'geladeira',
        ]]);
});

it('adds a purchase and sets a count by the difference', function (): void {
    [$manage, $stock, $audit] = manageStock();

    $manage->purchase(5, 20, null);
    $level = $manage->adjust(5, 18, 'quebrou');

    expect($level->qty)->toBe(18)
        ->and(array_map(fn (array $m) => [$m['kind'], $m['delta'], $m['orderId'], $m['note']], $stock->movements))->toBe([
            [MovementKind::Purchase, 20, null, null],
            [MovementKind::Adjust, -2, null, 'quebrou'],
        ])
        ->and($audit->entries[1])->toMatchArray(['action' => 'stock_adjust', 'summary' => ['delta' => -2, 'from' => 20, 'to' => 18]]);
});

it('writes no movement when the count matches, but still audits it', function (): void {
    [$manage, $stock, $audit] = manageStock();

    $manage->adjust(5, 0, null);

    expect($stock->movements)->toBe([])->and($audit->entries)->toHaveCount(1);
});

it('counts only today\'s sales as sold today', function (): void {
    [$manage, $stock] = manageStock();
    $stock->add(5, MovementKind::Sale, -3, 1, 7, null, new DateTimeImmutable('2026-11-15 23:00:00+00:00'));
    $stock->add(5, MovementKind::Sale, -2, 2, 7, null, new DateTimeImmutable('2026-11-16 08:00:00+00:00'));

    expect($manage->levels()[0]->soldToday)->toBe(2)->and($manage->levels()[0]->qty)->toBe(-5);
});

it('refuses bad quantities', function (Closure $call): void {
    [$manage] = manageStock();
    $call($manage);
})->with([
    'zero purchase' => [fn (ManageStock $m) => $m->purchase(5, 0, null)],
    'negative count' => [fn (ManageStock $m) => $m->adjust(5, -1, null)],
    'negative minimum' => [fn (ManageStock $m) => $m->configure(5, true, -1, null)],
])->throws(InvalidStockQty::class);

it('reports a missing variant', function (): void {
    [$manage] = manageStock();
    $manage->purchase(99, 1, null);
})->throws(MenuNotFound::class);

it('refuses without a session user', function (): void {
    [$manage, , , $session] = manageStock();
    $session->logout();
    $manage->purchase(5, 1, null);
})->throws(NotAuthenticated::class);
