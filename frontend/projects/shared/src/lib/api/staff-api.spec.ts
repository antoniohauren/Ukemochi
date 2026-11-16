import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SettingsApi } from './settings-api';
import { StaffApi } from './staff-api';

describe('StaffApi and SettingsApi', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists, creates and updates staff', async () => {
    const staff = TestBed.inject(StaffApi);
    const list = firstValueFrom(staff.list());
    http.expectOne({ method: 'GET', url: '/api/users' }).flush({ users: [] });
    expect(await list).toEqual({ users: [] });

    const body = { name: 'Amanda', role: 'waitress' as const, active: true };
    staff.create({ ...body, pin: '1234' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/users' }).request.body).toEqual({
      ...body,
      pin: '1234',
    });
    staff.update(3, body).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/users/3' }).request.body).toEqual(body);
  });

  it('resets a PIN', () => {
    TestBed.inject(StaffApi).resetPin(3, '9876').subscribe();
    const req = http.expectOne({ method: 'PUT', url: '/api/users/3/pin' });
    expect(req.request.body).toEqual({ pin: '9876' });
    req.flush(null);
  });

  it('reads and saves settings', () => {
    const api = TestBed.inject(SettingsApi);
    api.get().subscribe();
    http.expectOne({ method: 'GET', url: '/api/settings' }).flush({});
    const body = {
      restaurant_name: 'Sushi Ya',
      language: 'en' as const,
      paper_width: 58 as const,
      delivery_fee_enabled: true,
      delivery_fee_cents: 500,
    };
    api.update(body).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/settings' }).request.body).toEqual(body);
  });
});
