/** Computed by the API: `out` at qty ≤ 0, `low` at qty ≤ `stock_min`. */
export type StockStatus = 'ok' | 'low' | 'out';

/** `StockLevelResource`: expected quantity of one variant. `qty` may be negative. */
export interface StockLevel {
  variant_id: number;
  item_name: string;
  variant_name: string;
  track_stock: boolean;
  stock_min: number | null;
  qty: number;
  sold_today: number;
  status: StockStatus;
}

/** Tracked variants the staff should see a badge for (low or out), by variant id. */
export function stockAlerts(levels: readonly StockLevel[]): Record<number, StockLevel> {
  const alerts: Record<number, StockLevel> = {};
  for (const l of levels) {
    if (l.track_stock && l.status !== 'ok') {
      alerts[l.variant_id] = l;
    }
  }
  return alerts;
}

/** Body of `PUT /api/stock/{variantId}`. */
export interface StockConfigInput {
  track_stock: boolean;
  stock_min: number | null;
  note?: string | null;
}
