import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { CashApi, type Shift, StaffApi } from 'shared';
import { CashStore } from './cash-store';

const OPEN = { id: 1, closed_at: null } as unknown as Shift;
const CLOSED = { id: 1, closed_at: '2026-11-16T23:00:00+00:00' } as unknown as Shift;

describe('CashStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: CashStore;

  beforeEach(() => {
    localStorage.clear();
    api = {
      current: vi.fn(() => of(null)),
      recent: vi.fn(() => of([])),
      open: vi.fn(() => of(OPEN)),
      addMovement: vi.fn(() => of(OPEN)),
      close: vi.fn(() => of(CLOSED)),
    };
    TestBed.configureTestingModule({
      providers: [
        CashStore,
        { provide: CashApi, useValue: api },
        { provide: StaffApi, useValue: { list: () => of({ users: [{ id: 7, name: 'Amanda' }] }) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    store = TestBed.inject(CashStore);
  });

  it('loads the open shift, recent ones and staff names', async () => {
    await store.load();
    expect(store.current()).toBeNull();
    expect(store.names()).toEqual({ 7: 'Amanda' });
  });

  it('opens and closes, clearing the open shift once closed', async () => {
    expect(await store.open(10000, null)).toBeNull();
    expect(store.current()).toEqual(OPEN);
    expect(await store.close(9500, 'faltou')).toBeNull();
    expect(api['close']).toHaveBeenCalledWith(9500, 'faltou');
    expect(store.current()).toBeNull();
  });

  it('returns the error key when a write fails', async () => {
    api['addMovement'].mockReturnValue(
      throwError(() => ({ code: 'cash.no_open_shift', message: '' })),
    );
    expect(await store.addMovement({ kind: 'deposit', amount_cents: 100 })).toBe(
      'error.cash.no_open_shift',
    );
  });
});
