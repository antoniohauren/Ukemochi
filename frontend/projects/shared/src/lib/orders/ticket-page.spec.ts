import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { KitchenTicket } from '../api/order';
import { OrdersApi } from '../api/orders-api';
import { SettingsApi } from '../api/settings-api';
import { TicketStore } from './ticket-page';

const ticket = { kind: 'kitchen', number: 42, version: 3 } as KitchenTicket;

describe('TicketStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let print: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = {
      ticket: vi.fn(() => of(ticket)),
      printed: vi.fn(() => of({})),
    };
    print = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        TicketStore,
        { provide: OrdersApi, useValue: api },
        { provide: SettingsApi, useValue: { get: () => of({ paper_width: 80 }) } },
        { provide: DOCUMENT, useValue: { defaultView: { print } } },
      ],
    });
  });

  it('loads the ticket with the settings', async () => {
    const store = TestBed.inject(TicketStore);
    await store.load(42, 'kitchen');

    expect(api['ticket']).toHaveBeenCalledWith(42, 'kitchen');
    expect(store.ticket()).toBe(ticket);
    expect(store.settings()).toEqual({ paper_width: 80 });
  });

  it('prints, then records the version the ticket showed', async () => {
    const store = TestBed.inject(TicketStore);
    await store.load(42, 'kitchen');
    api['printed'].mockImplementation(() => {
      expect(print).toHaveBeenCalled();
      return of({});
    });

    expect(await store.print()).toBeNull();
    expect(api['printed']).toHaveBeenCalledWith(42, 'kitchen', 3);
  });

  it('returns the error key when recording the print fails', async () => {
    const store = TestBed.inject(TicketStore);
    await store.load(42, 'kitchen');
    api['printed'].mockReturnValue(throwError(() => ({ code: 'order.invalid_print_version' })));

    expect(await store.print()).toBe('error.order.invalid_print_version');
  });

  it('keeps the load error', async () => {
    api['ticket'].mockReturnValue(throwError(() => ({ code: 'order.not_found' })));
    const store = TestBed.inject(TicketStore);
    await store.load(9, 'bill');

    expect(store.loadError()).toBe('error.order.not_found');
  });
});
