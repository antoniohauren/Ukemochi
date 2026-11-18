import { type StockLevel, stockAlerts } from './stock';

function level(variant_id: number, fields: Partial<StockLevel>): StockLevel {
  return {
    variant_id,
    item_name: 'Coca',
    variant_name: 'Zero',
    track_stock: true,
    stock_min: 5,
    qty: 10,
    sold_today: 0,
    status: 'ok',
    ...fields,
  };
}

describe('stockAlerts', () => {
  it('keeps tracked low and out variants by id, skipping ok and untracked ones', () => {
    const low = level(1, { qty: 3, status: 'low' });
    const out = level(2, { qty: -1, status: 'out' });
    const alerts = stockAlerts([
      low,
      out,
      level(3, {}),
      level(4, { track_stock: false, qty: 0, status: 'out' }),
    ]);
    expect(alerts).toEqual({ 1: low, 2: out });
  });
});
