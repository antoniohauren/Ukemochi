import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { type Order, OrdersApi } from 'shared';
import { nextStatus, OrderBoard } from './order-board';

describe('nextStatus', () => {
  it('moves forward, out for delivery only for delivery', () => {
    expect(nextStatus({ status: 'open', type: 'dine_in' })).toBe('ready');
    expect(nextStatus({ status: 'ready', type: 'pickup' })).toBe('closed');
    expect(nextStatus({ status: 'ready', type: 'delivery' })).toBe('out_for_delivery');
    expect(nextStatus({ status: 'out_for_delivery', type: 'delivery' })).toBe('closed');
    expect(nextStatus({ status: 'closed', type: 'delivery' })).toBeNull();
  });
});

describe('OrderBoard', () => {
  it('advances an order and reports a refused move', async () => {
    localStorage.clear();
    const setStatus = vi
      .fn()
      .mockReturnValueOnce(of({}))
      .mockReturnValueOnce(throwError(() => ({ code: 'order.invalid_transition', message: '' })));
    const open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        OrderBoard,
        { provide: OrdersApi, useValue: { setStatus } },
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    const board = TestBed.inject(OrderBoard);
    const order = { id: 4, status: 'ready', type: 'delivery' } as Order;

    await board.advance(order);
    await board.advance(order);

    expect(setStatus).toHaveBeenCalledWith(4, 'out_for_delivery');
    expect(open).toHaveBeenCalledWith('Não é possível mudar para esse status.', undefined, {
      duration: 4000,
    });
  });
});
