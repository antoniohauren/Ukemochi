import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import type { OrderInput } from './order';
import { OrdersApi } from './orders-api';

describe('OrdersApi', () => {
  let http: HttpTestingController;
  let api: OrdersApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(OrdersApi);
  });

  afterEach(() => http.verify());

  it('lists active orders, or one status', async () => {
    const active = firstValueFrom(api.list());
    http.expectOne({ method: 'GET', url: '/api/orders' }).flush({ orders: [] });
    expect(await active).toEqual({ orders: [] });

    api.list('closed').subscribe();
    http.expectOne({ method: 'GET', url: '/api/orders?status=closed' }).flush({ orders: [] });
  });

  it('gets, creates and edits an order', () => {
    const body: OrderInput = {
      type: 'dine_in',
      customer_name: 'Amanda',
      lines: [{ variant_id: 3, qty: 2, addon_ids: [7] }],
    };
    api.get(5).subscribe();
    http.expectOne({ method: 'GET', url: '/api/orders/5' }).flush({});
    api.create(body).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders' }).request.body).toEqual(body);
    api.update(5, { ...body, edit_note: 'mais um' }).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/orders/5' }).request.body).toEqual({
      ...body,
      edit_note: 'mais um',
    });
  });

  it('moves status, cancels and reopens with a note', () => {
    api.setStatus(5, 'ready').subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/orders/5/status' }).request.body).toEqual({
      status: 'ready',
      note: null,
    });
    api.cancel(5, 'cliente desistiu', 'ligou').subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders/5/cancel' }).request.body).toEqual({
      reason: 'cliente desistiu',
      note: 'ligou',
    });
    api.reopen(5).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders/5/reopen' }).request.body).toEqual({
      note: null,
    });
  });

  it('fetches a ticket by kind and records a print', () => {
    api.ticket(5, 'kitchen').subscribe();
    http.expectOne({ method: 'GET', url: '/api/orders/5/ticket?kind=kitchen' });
    api.printed(5, 'bill', 3).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders/5/printed' }).request.body).toEqual({
      kind: 'bill',
      version: 3,
    });
  });
});
