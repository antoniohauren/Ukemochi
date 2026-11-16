import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiClient, ApiError } from './api-client';

describe('ApiClient', () => {
  let api: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends GET to /api with credentials and query params', async () => {
    const result = firstValueFrom(api.get<{ ok: boolean }>('/health', { page: 2 }));
    const req = http.expectOne('/api/health?page=2');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ok: true });
    expect(await result).toEqual({ ok: true });
  });

  it.each(['post', 'put', 'patch'] as const)('sends %s with a JSON body', async (method) => {
    const result = firstValueFrom(api[method]<{ id: number }>('/orders', { note: 'x' }));
    const req = http.expectOne('/api/orders');
    expect(req.request.method).toBe(method.toUpperCase());
    expect(req.request.body).toEqual({ note: 'x' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ id: 1 });
    expect(await result).toEqual({ id: 1 });
  });

  it('sends DELETE', async () => {
    const result = firstValueFrom(api.delete<null>('/orders/1'));
    const req = http.expectOne('/api/orders/1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
    expect(await result).toBeNull();
  });

  const failWith = async (respond: (url: string) => void): Promise<ApiError> => {
    const result = firstValueFrom(api.get('/x'));
    respond('/api/x');
    return result.then(
      () => {
        throw new Error('expected an error');
      },
      (e: ApiError) => e,
    );
  };

  it('maps an API error body to {code, message}', async () => {
    const error = await failWith((url) =>
      http
        .expectOne(url)
        .flush(
          { code: 'money.invalid', message: 'Bad amount', extra: 1 },
          { status: 422, statusText: 'Unprocessable' },
        ),
    );
    expect(error).toEqual({ code: 'money.invalid', message: 'Bad amount' });
  });

  it('keeps field errors of a validation failure', async () => {
    const error = await failWith((url) =>
      http.expectOne(url).flush(
        {
          code: 'validation',
          message: 'The name field is required.',
          errors: { name: ['The name field is required.'] },
        },
        { status: 422, statusText: 'Unprocessable' },
      ),
    );
    expect(error).toEqual({
      code: 'validation',
      message: 'The name field is required.',
      errors: { name: ['The name field is required.'] },
    });
  });

  it('maps an error without a code to unknown', async () => {
    const error = await failWith((url) =>
      http.expectOne(url).flush('<html>', { status: 500, statusText: 'Server Error' }),
    );
    expect(error.code).toBe('unknown');
    expect(typeof error.message).toBe('string');
  });

  it('maps a network failure to network', async () => {
    const error = await failWith((url) => http.expectOne(url).error(new ProgressEvent('error')));
    expect(error.code).toBe('network');
  });
});
