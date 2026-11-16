import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type ApiError } from './api/api-client';
import type { User } from './api/user';
import { AuthService } from './auth/auth';
import { LanguageService } from './i18n/language';
import { provideUkemochi } from './providers';

const admin: User = { id: 1, name: 'Ana', role: 'admin' };

describe('provideUkemochi', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideUkemochi(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    // The initializer restores the session before the app starts.
    const init = TestBed.inject(ApplicationInitStatus).donePromise;
    http.expectOne('/api/me').flush(admin);
    await init;
    TestBed.tick();
    http.expectOne('/api/settings').flush({ language: 'en' });
  });

  it('applies the restaurant default language once signed in', () => {
    expect(TestBed.inject(LanguageService).lang()).toBe('en');
  });

  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    http.verify();
  });

  it('restores the session user on startup', () => {
    expect(TestBed.inject(AuthService).user()).toEqual(admin);
  });

  it('sends the XSRF-TOKEN cookie back as X-XSRF-TOKEN on a POST, with credentials', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D; path=/';
    const result = firstValueFrom(TestBed.inject(ApiClient).post('/orders', {}));
    const req = http.expectOne('/api/orders');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('abc=');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
    await result;
  });

  it('clears the user and routes to login when any call returns 401', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(TestBed.inject(ApiClient).get('/orders')).catch(
      (e: ApiError) => e,
    );
    http
      .expectOne('/api/orders')
      .flush(
        { code: 'unauthenticated', message: 'Unauthenticated.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(await result).toMatchObject({ code: 'unauthenticated' });
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
