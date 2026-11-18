<?php

declare(strict_types=1);

namespace App\Infrastructure\Stock;

use App\Application\Stock\StockRepository;
use App\Domain\Stock\MovementKind;
use App\Domain\Stock\StockLevel;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;

final readonly class DatabaseStockRepository implements StockRepository
{
    /** Keeps the offset; Postgres reads it back into timestamptz. */
    private const string TIME = 'Y-m-d H:i:s.uP';

    public function __construct(private ConnectionInterface $db) {}

    public function level(int $variantId, \DateTimeImmutable $since): ?StockLevel
    {
        $row = $this->query($since)->where('v.id', $variantId)->first();

        return $row === null ? null : self::toLevel($row);
    }

    public function levels(\DateTimeImmutable $since): array
    {
        return array_values($this->query($since)
            ->orderBy('c.sort')->orderBy('c.id')->orderBy('i.sort')->orderBy('i.id')->orderBy('v.sort')->orderBy('v.id')
            ->get()->map(self::toLevel(...))->all());
    }

    public function tracked(array $variantIds): array
    {
        if ($variantIds === []) {
            return [];
        }

        /** @var list<int> $ids pdo_pgsql reads bigint as int */
        $ids = $this->db->table('variants')->whereIn('id', $variantIds)->where('track_stock', true)->pluck('id')->all();

        return $ids;
    }

    public function configure(int $variantId, bool $track, ?int $min): void
    {
        $this->db->table('variants')->where('id', $variantId)->update(['track_stock' => $track, 'stock_min' => $min]);
    }

    public function add(int $variantId, MovementKind $kind, int $delta, ?int $orderId, int $userId, ?string $note, \DateTimeImmutable $at): void
    {
        $this->db->table('stock_movements')->insert([
            'variant_id' => $variantId, 'kind' => $kind->value, 'qty_delta' => $delta, 'order_id' => $orderId,
            'note' => $note, 'created_by' => $userId, 'created_at' => $at->format(self::TIME),
        ]);
    }

    private function query(\DateTimeImmutable $since): Builder
    {
        $qty = $this->db->table('stock_movements')->selectRaw('coalesce(sum(qty_delta), 0)')->whereColumn('variant_id', 'v.id');
        $sold = $this->db->table('stock_movements')->selectRaw('coalesce(-sum(qty_delta), 0)')->whereColumn('variant_id', 'v.id')
            ->where('kind', MovementKind::Sale->value)->where('created_at', '>=', $since->format(self::TIME));

        return $this->db->table('variants as v')
            ->join('items as i', 'i.id', '=', 'v.item_id')
            ->join('categories as c', 'c.id', '=', 'i.category_id')
            ->whereNull('v.deleted_at')
            ->select(['v.id', 'i.name as item_name', 'v.name as variant_name', 'v.track_stock', 'v.stock_min'])
            ->selectSub($qty, 'qty')
            ->selectSub($sold, 'sold_today');
    }

    private static function toLevel(object $row): StockLevel
    {
        /** @var object{id: int|string, item_name: string, variant_name: string, track_stock: bool, stock_min: int|string|null, qty: int|string, sold_today: int|string} $row */
        return new StockLevel(
            (int) $row->id, $row->item_name, $row->variant_name, (bool) $row->track_stock,
            $row->stock_min === null ? null : (int) $row->stock_min, (int) $row->qty, (int) $row->sold_today,
        );
    }
}
