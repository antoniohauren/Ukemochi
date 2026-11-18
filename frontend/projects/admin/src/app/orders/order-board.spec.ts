import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { type Order, OrdersApi, stageOf } from 'shared';
import { nextStatus, OrderBoard } from './order-board';

describe('nextStatus', () => {
  it('moves forward, out for delivery only for delivery', () => {
    const paid = { balance_cents: 0 };
    expect(nextStatus({ status: 'open', type: 'dine_in', ...paid })).toBe('ready');
    expect(nextStatus({ status: 'ready', type: 'pickup', ...paid })).toBe('closed');
    expect(nextStatus({ status: 'ready', type: 'delivery', ...paid })).toBe('out_for_delivery');
    expect(nextStatus({ status: 'out_for_delivery', type: 'delivery', ...paid })).toBe('closed');
    expect(nextStatus({ status: 'closed', type: 'delivery', ...paid })).toBeNull();
  });

  it('only closes once paid in full', () => {
    expect(nextStatus({ status: 'ready', type: 'pickup', balance_cents: 500 })).toBeNull();
    expect(
      nextStatus({ status: 'out_for_delivery', type: 'delivery', balance_cents: 1 }),
    ).toBeNull();
  });
});

describe('stageOf', () => {
  const base = { status: 'open', print_status: null } as const;

  it('is open until the kitchen ticket is printed, then production', () => {
    expect(stageOf({ ...base, print_status: 'not_printed' })).toBe('open');
    expect(stageOf(base)).toBe('production');
    expect(stageOf({ ...base, status: 'ready' })).toBe('production');
  });

  it('is left when out for delivery', () => {
    expect(stageOf({ ...base, status: 'out_for_delivery' })).toBe('left');
  });

  it('is done when closed', () => {
    expect(stageOf({ ...base, status: 'closed' })).toBe('done');
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

  it('closes only after the user confirms', async () => {
    const setStatus = vi.fn().mockReturnValue(of({}));
    const answers = [false, true];
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(answers.shift()) })) };
    TestBed.configureTestingModule({
      providers: [
        OrderBoard,
        { provide: OrdersApi, useValue: { setStatus } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    const board = TestBed.inject(OrderBoard);
    const order = { id: 7, status: 'ready', type: 'pickup', balance_cents: 0 } as Order;

    await board.advance(order);
    expect(setStatus).not.toHaveBeenCalled();
    await board.advance(order);
    expect(setStatus).toHaveBeenCalledWith(7, 'closed');
  });
});
