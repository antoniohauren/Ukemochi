import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';
import { type Customer, type CustomerList, CustomersApi } from 'shared';
import { CustomersStore } from './customers-store';

const ANA: Customer = { id: 1, name: 'Ana', phone: null, note: null, addresses: [] };
const BODY = { name: 'Ana', phone: null, note: null, addresses: [] };

describe('CustomersStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: CustomersStore;

  beforeEach(() => {
    api = {
      list: vi.fn(() => of({ customers: [ANA] })),
      get: vi.fn(() => of(ANA)),
      orders: vi.fn(() => of({ orders: [] })),
      create: vi.fn(() => of(ANA)),
      update: vi.fn(() => of(ANA)),
    };
    TestBed.configureTestingModule({
      providers: [
        CustomersStore,
        { provide: CustomersApi, useValue: api },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    store = TestBed.inject(CustomersStore);
  });

  it('keeps the newest search when an older one answers late', async () => {
    const slow = new Subject<CustomerList>();
    api['list'].mockReturnValueOnce(slow).mockReturnValueOnce(of({ customers: [ANA] }));
    const first = store.search('a');
    await store.search('an');
    slow.next({ customers: [] });
    slow.complete();
    await first;
    expect(store.customers()).toEqual([ANA]);
  });

  it('loads the profile with its orders', async () => {
    await store.load(1);
    expect(store.customer()).toEqual(ANA);
    expect(store.orders()).toEqual([]);
  });

  it('creates without an id and updates with one', async () => {
    expect(await store.save(null, BODY)).toEqual(ANA);
    expect(api['create']).toHaveBeenCalledWith(BODY);
    await store.save(1, BODY);
    expect(api['update']).toHaveBeenCalledWith(1, BODY);
  });

  it('returns the error key when a save fails', async () => {
    api['create'].mockReturnValue(
      throwError(() => ({ status: 409, code: 'customer.phone_taken' })),
    );
    expect(await store.save(null, BODY)).toBe('error.customer.phone_taken');
  });
});
