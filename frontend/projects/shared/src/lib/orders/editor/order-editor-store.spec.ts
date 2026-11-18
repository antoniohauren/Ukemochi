import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { type Observable, of, throwError } from 'rxjs';
import { type Menu } from '../../api/menu';
import { MenuApi } from '../../api/menu-api';
import { type StockLevel } from '../../api/stock';
import { StockApi } from '../../api/stock-api';
import { type Order } from '../../api/order';
import { OrdersApi } from '../../api/orders-api';
import { SettingsApi } from '../../api/settings-api';
import { type DraftLine } from '../../orders/order-draft';
import { OrderEditorStore } from './order-editor-store';
import { orderForm } from './order-form';

const MENU: Menu = { categories: [] };
const LINE: DraftLine = {
  id: null,
  variant_id: 100,
  category_name: 'Uramaki',
  item_name: 'Philadelphia',
  variant_name: 'Inteiro',
  unit_price_cents: 3200,
  qty: 1,
  note: null,
  addons: [],
};
const SAVED = {
  id: 12,
  lines: [{ ...LINE, id: 5, total_cents: 3200 }],
} as unknown as Order;

describe('OrderEditorStore', () => {
  let orders: Record<string, ReturnType<typeof vi.fn>>;
  let settings: { delivery_fee_enabled: boolean; delivery_fee_cents: number };
  let navigate: ReturnType<typeof vi.fn>;
  let store: OrderEditorStore;
  let stockLevels: () => Observable<StockLevel[]>;

  beforeEach(() => {
    localStorage.clear();
    settings = { delivery_fee_enabled: true, delivery_fee_cents: 700 };
    orders = {
      get: vi.fn(() => of(SAVED)),
      create: vi.fn(() => of(SAVED)),
      update: vi.fn(() => of(SAVED)),
    };
    navigate = vi.fn(async () => true);
    stockLevels = () => of([]);
    TestBed.configureTestingModule({
      providers: [
        OrderEditorStore,
        { provide: OrdersApi, useValue: orders },
        { provide: MenuApi, useValue: { menu: () => of(MENU) } },
        { provide: SettingsApi, useValue: { get: () => of(settings) } },
        { provide: StockApi, useValue: { levels: () => stockLevels() } },
        { provide: Router, useValue: { navigateByUrl: navigate } },
      ],
    });
    store = TestBed.inject(OrderEditorStore);
  });

  const value = () => {
    const form = orderForm();
    form.controls.customer_name.setValue('Ana');
    return form.getRawValue();
  };

  it('keeps low and out tracked variants for the picker, and loads without stock on failure', async () => {
    const low: StockLevel = {
      variant_id: 100,
      item_name: 'Coca',
      variant_name: 'Zero',
      track_stock: true,
      stock_min: 5,
      qty: 3,
      sold_today: 17,
      status: 'low',
    };
    stockLevels = () => of([low, { ...low, variant_id: 101, qty: 9, status: 'ok' }]);
    await store.load(null);
    expect(store.stock()).toEqual({ 100: low });

    stockLevels = () => throwError(() => new Error('offline'));
    await store.load(null);
    expect(store.loadError()).toBeNull();
    expect(store.menu()).not.toBeNull();
    expect(store.stock()).toEqual({});
  });

  it('defaults the delivery fee from settings only when it is on', async () => {
    await store.load(null);
    expect(store.defaultFeeCents()).toBe(700);
    settings.delivery_fee_enabled = false;
    await store.load(null);
    expect(store.defaultFeeCents()).toBe(0);
  });

  it('shows the fee field when settings charge one or the saved order has one', async () => {
    settings.delivery_fee_enabled = false;
    await store.load(null);
    expect(store.showFee()).toBe(false);
    orders['get'].mockReturnValue(of({ ...SAVED, delivery_fee_cents: 500 }));
    await store.load(12);
    expect(store.showFee()).toBe(true);
    settings.delivery_fee_enabled = true;
    await store.load(null);
    expect(store.showFee()).toBe(true);
  });

  it('adds, replaces and removes draft lines with preview totals', () => {
    store.add(LINE);
    store.add({ ...LINE, variant_id: 101 });
    store.replace(0, { ...LINE, qty: 3 });
    expect(store.views().map((v) => v.total_cents)).toEqual([9600, 3200]);
    store.remove(0);
    expect(store.lines().map((l) => l.variant_id)).toEqual([101]);
  });

  it('refuses to send an order without lines', async () => {
    await store.load(null);
    expect(await store.submit(value())).toBe('order.no_lines');
    expect(orders['create']).not.toHaveBeenCalled();
  });

  it('creates a new order, shows a snackbar and opens it', async () => {
    const snack = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    await store.load(null);
    store.add(LINE);
    expect(await store.submit(value())).toBeNull();
    expect(orders['create']).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Ana',
        lines: [expect.not.objectContaining({ id: 5 })],
      }),
    );
    expect(snack).toHaveBeenCalledWith('Pedido enviado.', undefined, { duration: 3000 });
    expect(navigate).toHaveBeenCalledWith('/orders/12');
  });

  it('edits a saved order keeping its line ids', async () => {
    await store.load(12);
    expect(store.order()).toBe(SAVED);
    store.add(LINE);
    expect(await store.submit(value())).toBeNull();
    const [id, body] = orders['update'].mock.calls[0];
    expect(id).toBe(12);
    expect(body.lines.map((l: { id?: number }) => l.id)).toEqual([5, undefined]);
  });

  it('keeps the draft and returns the error key when the API refuses', async () => {
    orders['create'].mockReturnValue(
      throwError(() => ({ code: 'order.addon_not_allowed', message: '' })),
    );
    await store.load(null);
    store.add(LINE);
    expect(await store.submit(value())).toBe('error.order.addon_not_allowed');
    expect(store.lines().length).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
