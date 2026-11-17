import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentsApi } from './payments-api';

describe('PaymentsApi', () => {
  let http: HttpTestingController;
  let api: PaymentsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(PaymentsApi);
  });

  afterEach(() => http.verify());

  it('reads, pays and voids', () => {
    api.forOrder(42).subscribe();
    http.expectOne({ method: 'GET', url: '/api/orders/42/payments' }).flush({});
    const body = { method: 'cash' as const, amount_cents: 2000, tendered_cents: 5000 };
    api.pay(42, body).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders/42/payments' }).request.body).toEqual(
      body,
    );
    api.split(42, { mode: 'equal', n: 3 }).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/orders/42/split' }).request.body).toEqual({
      mode: 'equal',
      n: 3,
    });
    api.void(7, 'errado').subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/payments/7/void' }).request.body).toEqual({
      note: 'errado',
    });
  });
});
