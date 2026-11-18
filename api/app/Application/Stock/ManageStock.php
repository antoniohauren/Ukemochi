<?php

declare(strict_types=1);

namespace App\Application\Stock;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Clock;
use App\Application\Transaction;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Stock\InvalidStockQty;
use App\Domain\Stock\MovementKind;
use App\Domain\Stock\StockLevel;

/** Stock levels, tracking settings, purchases and counts. Sales are written by ManageOrders. */
final readonly class ManageStock
{
    public function __construct(
        private StockRepository $stock,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
        private Clock $clock,
    ) {}

    /** @return list<StockLevel> */
    public function levels(): array
    {
        return $this->stock->levels($this->today());
    }

    public function configure(int $variantId, bool $track, ?int $min, ?string $note): StockLevel
    {
        if ($min !== null && $min < 0) {
            throw new InvalidStockQty;
        }

        return $this->write($variantId, 'configure', function (StockLevel $level) use ($variantId, $track, $min): array {
            $this->stock->configure($variantId, $track, $min);

            return ['track_stock' => $track, 'stock_min' => $min];
        }, $note);
    }

    public function purchase(int $variantId, int $qty, ?string $note): StockLevel
    {
        if ($qty < 1) {
            throw new InvalidStockQty;
        }

        return $this->write($variantId, 'purchase', fn (StockLevel $level, int $userId): array => $this->move($variantId, MovementKind::Purchase, $qty, $userId, $note), $note);
    }

    /**
     * Sets the expected quantity to what was counted by writing the difference.
     * shortcut: a sale committing between the read and the insert is counted twice; lock per variant if counts drift.
     */
    public function adjust(int $variantId, int $counted, ?string $note): StockLevel
    {
        return $this->write($variantId, 'adjust', fn (StockLevel $level, int $userId): array => [
            ...$this->move($variantId, MovementKind::Adjust, $level->adjustTo($counted), $userId, $note),
            'from' => $level->qty, 'to' => $counted,
        ], $note);
    }

    /** @return array<string, mixed> */
    private function move(int $variantId, MovementKind $kind, int $delta, int $userId, ?string $note): array
    {
        if ($delta !== 0) {
            $this->stock->add($variantId, $kind, $delta, null, $userId, $note, $this->clock->now());
        }

        return ['delta' => $delta];
    }

    /** @param  \Closure(StockLevel, int): array<string, mixed>  $change  returns the audit summary */
    private function write(int $variantId, string $action, \Closure $change, ?string $note): StockLevel
    {
        $userId = $this->session->userId() ?? throw new NotAuthenticated;

        return $this->transaction->run(function () use ($variantId, $action, $change, $note, $userId): StockLevel {
            $level = $this->stock->level($variantId, $this->today()) ?? throw new MenuNotFound('variant', $variantId);
            $this->audit->record($userId, 'variant', $variantId, "stock_{$action}", $change($level, $userId), $note);

            return $this->stock->level($variantId, $this->today()) ?? throw new \LogicException("Variant {$variantId} vanished.");
        });
    }

    // shortcut: "today" is the calendar day in the app timezone (UTC); use the restaurant's timezone once it is a setting.
    private function today(): \DateTimeImmutable
    {
        return $this->clock->now()->setTime(0, 0);
    }
}
