import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient, type ApiError } from '../api/api-client';
import type { User } from '../api/user';
import { AuthService } from './auth';
import { authInterceptor } from './auth.interceptor';

const amanda: User = { id: 1, name: 'Amanda', role: 'waitress' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const flushTicks = () => new Promise((resolve) => setTimeout(resolve));

  it('fetches the CSRF cookie before posting the login', async () => {
    const result = auth.login('Amanda', '1234');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await flushTicks();
    const req = http.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Amanda', pin: '1234' });
    req.flush(amanda);
    expect(await result).toEqual(amanda);
    expect(auth.user()).toEqual(amanda);
  });

  it('rejects with the API error and stays logged out on wrong PIN', async () => {
    const result = auth.login('Amanda', '0000').catch((e: ApiError) => e);
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await flushTicks();
    http
      .expectOne('/api/login')
      .flush(
        { code: 'auth.invalid_credentials', message: 'Wrong name or PIN.' },
        { status: 422, statusText: 'Unprocessable' },
      );
    expect(await result).toEqual({
      code: 'auth.invalid_credentials',
      message: 'Wrong name or PIN.',
    });
    expect(auth.user()).toBeNull();
  });

  it('restores the user from /api/me', async () => {
    const result = auth.restore();
    http.expectOne('/api/me').flush(amanda);
    await result;
    expect(auth.user()).toEqual(amanda);
  });

  it('stays logged out when /api/me fails', async () => {
    const result = auth.restore();
    http.expectOne('/api/me').error(new ProgressEvent('error'));
    await result;
    expect(auth.user()).toBeNull();
  });

  it('gives up on /api/me after 5s so a stalled network cannot block startup', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const result = auth.restore();
    const req = http.expectOne('/api/me');
    vi.advanceTimersByTime(5000);
    vi.useRealTimers();
    await result;
    expect(req.cancelled).toBe(true);
    expect(auth.user()).toBeNull();
  });

  it('counts down retry_after when login is throttled', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const result = auth.login('Amanda', '0000').catch((e: ApiError) => e);
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await flushTicks();
    http
      .expectOne('/api/login')
      .flush(
        { code: 'auth.throttled', message: 'Too many', retry_after: 2 },
        { status: 429, statusText: 'Too Many Requests' },
      );
    expect(await result).toMatchObject({ code: 'auth.throttled', retry_after: 2 });
    expect(auth.retryIn()).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(auth.retryIn()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(auth.retryIn()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(auth.retryIn()).toBe(0);
    vi.useRealTimers();
  });

  it('logs out on the server and goes to login', async () => {
    await signIn();
    const result = auth.logout();
    http.expectOne('/api/logout').flush(null, { status: 204, statusText: 'No Content' });
    await result;
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clears the user on logout even when the server is unreachable', async () => {
    await signIn();
    const result = auth.logout();
    http.expectOne('/api/logout').error(new ProgressEvent('error'));
    await result;
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clears the user and goes to login when any call returns 401', async () => {
    await signIn();
    const call = firstValueFrom(TestBed.inject(ApiClient).get('/orders')).catch((e: ApiError) => e);
    http
      .expectOne('/api/orders')
      .flush(
        { code: 'unauthenticated', message: 'Unauthenticated.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(await call).toMatchObject({ code: 'unauthenticated' });
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not navigate on 401 while already logged out', async () => {
    const result = auth.restore();
    http
      .expectOne('/api/me')
      .flush(
        { code: 'unauthenticated', message: 'Unauthenticated.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await result;
    expect(navigate).not.toHaveBeenCalled();
  });

  async function signIn(): Promise<void> {
    const result = auth.restore();
    http.expectOne('/api/me').flush(amanda);
    await result;
  }
});
