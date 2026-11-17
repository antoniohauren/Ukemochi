import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CashApi } from './cash-api';

describe('CashApi', () => {
  let http: HttpTestingController;
  let api: CashApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CashApi);
  });

  afterEach(() => http.verify());

  it('unwraps the open shift and the recent list', async () => {
    const current = firstValueFrom(api.current());
    http.expectOne({ method: 'GET', url: '/api/shifts/current' }).flush({ shift: null });
    expect(await current).toBeNull();

    const recent = firstValueFrom(api.recent());
    http.expectOne({ method: 'GET', url: '/api/shifts' }).flush({ shifts: [] });
    expect(await recent).toEqual([]);
  });

  it('opens, moves cash and closes', () => {
    api.open(10000).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/shifts' }).request.body).toEqual({
      opening_float_cents: 10000,
      note: null,
    });
    const meal = { kind: 'staff_meal' as const, amount_cents: 2200, staff_name: 'Amanda' };
    api.addMovement(meal).subscribe();
    expect(
      http.expectOne({ method: 'POST', url: '/api/shifts/current/movements' }).request.body,
    ).toEqual(meal);
    api.close(9500, 'faltou').subscribe();
    expect(
      http.expectOne({ method: 'POST', url: '/api/shifts/current/close' }).request.body,
    ).toEqual({ counted_cents: 9500, note: 'faltou' });
  });
});
