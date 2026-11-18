import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { StockApi, type StockLevel } from 'shared';
import { StockStore } from './stock-store';

const level = (variant_id: number, fields: Partial<StockLevel> = {}): StockLevel => ({
  variant_id,
  item_name: 'Coca',
  variant_name: 'Zero',
  track_stock: true,
  stock_min: 5,
  qty: 10,
  sold_today: 0,
  status: 'ok',
  ...fields,
});

describe('StockStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: StockStore;
  const form = { track: true, min: 5, qty: 20, note: '  ' };

  beforeEach(() => {
    localStorage.clear();
    api = {
      levels: vi.fn(() =>
        of([
          level(1, { qty: 3, status: 'low' }),
          level(2),
          level(3, { track_stock: false, qty: 0, status: 'out' }),
        ]),
      ),
      configure: vi.fn(() => of(level(1))),
      purchase: vi.fn(() => of(level(1))),
      adjust: vi.fn(() => of(level(1))),
    };
    TestBed.configureTestingModule({
      providers: [
        StockStore,
        { provide: StockApi, useValue: api },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    store = TestBed.inject(StockStore);
  });

  it('loads levels and alerts only on tracked low or out variants', async () => {
    await store.load();
    expect(store.levels()).toHaveLength(3);
    expect(store.alerts().map((l) => l.variant_id)).toEqual([1]);
  });

  it('sends each mode to its endpoint with a blank note as null, then reloads', async () => {
    expect(await store.save('settings', 1, { ...form, min: null })).toBeNull();
    expect(api['configure']).toHaveBeenCalledWith(1, {
      track_stock: true,
      stock_min: null,
      note: null,
    });
    await store.save('purchase', 1, form);
    expect(api['purchase']).toHaveBeenCalledWith(1, 20, null);
    await store.save('count', 1, { ...form, qty: 0, note: 'quebrou' });
    expect(api['adjust']).toHaveBeenCalledWith(1, 0, 'quebrou');
    expect(api['levels']).toHaveBeenCalledTimes(3);
  });

  it('returns the error key when a write fails', async () => {
    api['purchase'].mockReturnValue(throwError(() => ({ code: 'stock.invalid_qty', message: '' })));
    expect(await store.save('purchase', 1, form)).toBe('error.stock.invalid_qty');
  });
});
