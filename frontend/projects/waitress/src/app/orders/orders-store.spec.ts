import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';
import { type Order, OrdersApi, type OrderUpdated, RealtimeService } from 'shared';
import { OrderStore, OrdersStore } from './orders-store';

const order = (id: number, status: Order['status'] = 'open') => ({ id, status }) as Order;

describe('order stores', () => {
  let updates: Subject<OrderUpdated | null>;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    localStorage.clear();
    updates = new Subject();
    api = {
      list: vi.fn(() => of({ orders: [order(1)] })),
      get: vi.fn((id: number) => of(order(id))),
      cancel: vi.fn((id: number) => of(order(id, 'cancelled'))),
    };
    TestBed.configureTestingModule({
      providers: [
        OrdersStore,
        OrderStore,
        { provide: OrdersApi, useValue: api },
        { provide: RealtimeService, useValue: { orderUpdates$: updates } },
      ],
    });
  });

  describe('OrdersStore', () => {
    it('refetches the list on every order.updated, even with the same version, and on reconnect', () => {
      const store = TestBed.inject(OrdersStore);
      store.load();
      expect(store.orders()).toEqual([order(1)]);

      api['list'].mockReturnValue(of({ orders: [order(1, 'ready'), order(2)] }));
      updates.next({ id: 1, version: 1 });
      updates.next({ id: 1, version: 1 });
      updates.next(null);
      expect(api['list']).toHaveBeenCalledTimes(4);
      expect(store.orders()?.map((o) => o.id)).toEqual([1, 2]);
    });

    it('keeps the last list and a translated error when a refetch fails', () => {
      const store = TestBed.inject(OrdersStore);
      store.load();
      api['list'].mockReturnValue(throwError(() => ({ code: 'network', message: '' })));
      updates.next({ id: 1, version: 2 });
      expect(store.orders()).toEqual([order(1)]);
      expect(store.loadError()).toBe('error.network');
      updates.next(null); // the stream survives the error
      expect(api['list']).toHaveBeenCalledTimes(3);
    });

    it('keeps reloading by hand after the live stream ends with an error (signed out)', () => {
      const store = TestBed.inject(OrdersStore);
      updates.error({ code: 'unauthenticated', message: '' });
      store.load();
      expect(api['list']).toHaveBeenCalledTimes(1);
      expect(store.orders()).toEqual([order(1)]);
    });
  });

  describe('OrderStore', () => {
    it('keeps reloading by hand after the live stream ends with an error', () => {
      const store = TestBed.inject(OrderStore);
      updates.error({ code: 'unauthenticated', message: '' });
      store.open(7);
      expect(store.order()?.id).toBe(7);
    });

    it('refetches only on events for its order or a reconnect', () => {
      const store = TestBed.inject(OrderStore);
      store.open(7);
      expect(store.order()?.id).toBe(7);
      updates.next({ id: 8, version: 1 });
      updates.next({ id: 7, version: 1 });
      updates.next(null);
      expect(api['get']).toHaveBeenCalledTimes(3);
    });

    it('cancels with a reason and shows a snackbar, or returns the error key', async () => {
      const store = TestBed.inject(OrderStore);
      const snack = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
      store.open(7);
      expect(await store.cancel('cliente desistiu')).toBeNull();
      expect(api['cancel']).toHaveBeenCalledWith(7, 'cliente desistiu');
      expect(store.order()?.status).toBe('cancelled');
      expect(snack).toHaveBeenCalledWith('Pedido cancelado.', undefined, { duration: 3000 });

      api['cancel'].mockReturnValue(throwError(() => ({ code: 'order.not_found', message: '' })));
      expect(await store.cancel('x')).toBe('error.order.not_found');
    });
  });
});
