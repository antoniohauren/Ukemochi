import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { dayRange, ReportsApi } from './reports-api';

describe('ReportsApi', () => {
  it('asks for the period and lists backups', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(ReportsApi);

    api.period('2026-11-16T03:00:00.000Z', '2026-11-17T03:00:00.000Z').subscribe();
    api.backups().subscribe();

    http
      .expectOne('/api/reports?from=2026-11-16T03:00:00.000Z&to=2026-11-17T03:00:00.000Z')
      .flush({});
    http.expectOne('/api/backups').flush({ backups: [] });
    http.verify();
    expect(api.backupUrl('ukemochi-20261116-230000.dump')).toBe(
      '/api/backups/ukemochi-20261116-230000.dump',
    );
  });
});

describe('dayRange', () => {
  it('spans local midnight of the first day to local midnight after the last', () => {
    const { from, to } = dayRange('2026-11-16', '2026-11-30');

    expect(new Date(from)).toEqual(new Date(2026, 10, 16));
    expect(new Date(to)).toEqual(new Date(2026, 11, 1));
  });
});
