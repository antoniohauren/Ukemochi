import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { type Order, type OrderPayments, type Payment, PaymentsApi } from 'shared';
import { PayStore } from './pay-store';

const ORDER = {
  id: 42,
  status: 'open',
  balance_cents: 11300,
  lines: [
    { id: 5, qty: 2 },
    { id: 6, qty: 1 },
  ],
} as unknown as Order;
const DATA: OrderPayments = { order: ORDER, payments: [] };
const CASH = { id: 1, method: 'cash', change_cents: 3000 } as unknown as Payment;

describe('PayStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: PayStore;

  beforeEach(async () => {
    api = {
      forOrder: vi.fn(() => of(DATA)),
      split: vi.fn(() =>
        of({
          shares: [{ payer_label: null, amount_cents: 3767, allocations: [] }],
          remainder_cents: 0,
        }),
      ),
      pay: vi.fn(() =>
        of({ order: { ...ORDER, status: 'closed', balance_cents: 0 }, payments: [CASH] }),
      ),
      void: vi.fn(() => of(DATA)),
    };
    TestBed.configureTestingModule({
      providers: [PayStore, { provide: PaymentsApi, useValue: api }],
    });
    store = TestBed.inject(PayStore);
    await store.open(42);
  });

  it('suggests the whole balance by default, without asking for a split', () => {
    expect(store.suggestion()).toEqual({ amount_cents: 11300, allocations: [] });
    expect(api['split']).not.toHaveBeenCalled();
  });

  it('asks the API for an equal share and suggests the first one', () => {
    store.setMode('equal');
    store.setN(3);

    expect(api['split']).toHaveBeenLastCalledWith(42, { mode: 'equal', n: 3 });
    expect(store.suggestion()?.amount_cents).toBe(3767);
  });

  it('sends this payer units as one payer, kept within each line quantity', () => {
    store.setMode('items');
    store.setPick(5, 1);
    store.setPick(6, 1);
    store.setPick(6, 0);

    expect(api['split']).toHaveBeenLastCalledWith(42, {
      mode: 'units',
      payers: [{ picks: [{ line_id: 5, qty: '1' }] }],
    });

    store.setPick(5, 9);
    expect(store.picks()).toEqual({ 5: 2 });
    store.setPick(5, -1);
    expect(store.picks()).toEqual({});
  });

  it('keeps no suggestion when nothing is picked or the split is refused', () => {
    store.setMode('items');
    expect(store.suggestion()).toBeNull();

    api['split'].mockReturnValue(throwError(() => ({ code: 'split.invalid', message: '' })));
    store.setPick(5, 1);
    expect(store.previewError()).toBe('error.split.invalid');
    expect(store.suggestion()).toBeNull();
  });

  it('pays, reports change and closing, and counts one equal payer less', async () => {
    store.setMode('equal');
    store.setN(3);

    const result = await store.pay({ method: 'cash', amount_cents: 3767, tendered_cents: 6767 });

    expect(result).toEqual({ ok: true, change_cents: 3000, closed: true });
    expect(store.n()).toBe(2);
    expect(store.data()?.payments).toEqual([CASH]);
  });

  it('returns the error key when a payment fails', async () => {
    api['pay'].mockReturnValue(throwError(() => ({ code: 'cash.no_open_shift', message: '' })));

    expect(await store.pay({ method: 'pix', amount_cents: 100 })).toEqual({
      ok: false,
      error: 'error.cash.no_open_shift',
    });
    expect(store.saving()).toBe(false);
  });

  it('voids a payment', async () => {
    expect(await store.void(1)).toBeNull();
    expect(api['void']).toHaveBeenCalledWith(1);
  });
});
