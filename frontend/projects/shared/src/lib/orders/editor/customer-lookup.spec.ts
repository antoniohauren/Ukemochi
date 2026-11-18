import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { type Customer } from '../../api/customer';
import { CustomersApi } from '../../api/customers-api';
import { CustomerLookup } from './customer-lookup';

const ANA: Customer = { id: 3, name: 'Ana', phone: '11987654321', note: null, addresses: [] };

describe('CustomerLookup', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let lookup: CustomerLookup;

  beforeEach(() => {
    api = {
      list: vi.fn(() => of({ customers: [{ ...ANA, id: 4, phone: '119876543210' }, ANA] })),
      create: vi.fn(() => of(ANA)),
    };
    TestBed.configureTestingModule({
      providers: [CustomerLookup, { provide: CustomersApi, useValue: api }],
    });
    lookup = TestBed.inject(CustomerLookup);
  });

  it('searches by digits and keeps only the exact phone match', async () => {
    expect(await lookup.find('(11) 98765-4321')).toEqual(ANA);
    expect(api['list']).toHaveBeenCalledWith('11987654321');
    expect(lookup.missing()).toBe(false);
  });

  it('flags a phone no one has', async () => {
    api['list'].mockReturnValue(of({ customers: [] }));
    expect(await lookup.find('2133334444')).toBeNull();
    expect(lookup.missing()).toBe(true);
  });

  it('saves a new customer and clears missing', async () => {
    api['list'].mockReturnValue(of({ customers: [] }));
    await lookup.find('11987654321');
    const body = { name: 'Ana', phone: '11987654321', note: null, addresses: [] };
    expect(await lookup.save(body)).toEqual(ANA);
    expect(api['create']).toHaveBeenCalledWith(body);
    expect(lookup.missing()).toBe(false);
    expect(lookup.customer()).toEqual(ANA);
  });

  it('shows the API error code', async () => {
    api['create'].mockReturnValue(
      throwError(() => ({ status: 409, code: 'customer.phone_taken', message: '' })),
    );
    expect(
      await lookup.save({ name: 'A', phone: '11987654321', note: null, addresses: [] }),
    ).toBeNull();
    expect(lookup.error()).toBe('error.customer.phone_taken');
  });
});
