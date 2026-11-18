import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { dayRange } from 'shared';
import { ReportsStore, today } from './reports-store';

describe('ReportsStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReportsStore],
    });
    return { store: TestBed.inject(ReportsStore), http: TestBed.inject(HttpTestingController) };
  }

  it('loads the report for local days', async () => {
    const { store, http } = setup();
    const { from, to } = dayRange('2026-11-16', '2026-11-16');

    const done = store.load('2026-11-16', '2026-11-16');
    http
      .expectOne(
        (r) =>
          r.url === '/api/reports' && r.params.get('from') === from && r.params.get('to') === to,
      )
      .flush({ orders_count: 1 });
    await done;

    expect(store.report()?.orders_count).toBe(1);
    expect(store.error()).toBeNull();
  });

  it('shows the error key when the report fails', async () => {
    const { store, http } = setup();

    const done = store.load('2026-11-16', '2026-11-16');
    http
      .expectOne((r) => r.url === '/api/reports')
      .flush({ code: 'forbidden', message: 'no' }, { status: 403, statusText: 'Forbidden' });
    await done;

    expect(store.error()).toBe('error.forbidden');
  });

  it('formats today as a local date', () => {
    expect(today(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
