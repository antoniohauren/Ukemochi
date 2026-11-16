import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

/** Error shape the API returns (`{code, message}`); frontends translate by `code`. */
export interface ApiError {
  code: string;
  message: string;
  /** Field messages, only when `code` is `validation`. */
  errors?: Record<string, string[]>;
  /** Seconds until the next attempt is allowed, only when `code` is `auth.throttled`. */
  retry_after?: number;
}

type Params = HttpParams | Record<string, string | number | boolean | readonly string[]>;

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  get<T>(path: string, params?: Params): Observable<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string, params?: Params): Observable<T> {
    return this.request<T>('DELETE', path, undefined, params);
  }

  /** Sets the `XSRF-TOKEN` cookie that Angular echoes back as `X-XSRF-TOKEN`. */
  csrfCookie(): Observable<null> {
    return this.http
      .get<null>('/sanctum/csrf-cookie', { withCredentials: true })
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  private request<T>(method: string, path: string, body?: unknown, params?: Params): Observable<T> {
    return this.http
      .request<T>(method, `${this.baseUrl}${path}`, { body, params, withCredentials: true })
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { code: 'unknown', message: String(error) };
  }
  if (error.status === 0) {
    return { code: 'network', message: error.message };
  }
  const body: unknown = error.error;
  if (isApiError(body)) {
    const { code, message, errors, retry_after } = body;
    return {
      code,
      message,
      ...(errors !== undefined && { errors }),
      ...(retry_after !== undefined && { retry_after }),
    };
  }
  return { code: 'unknown', message: error.message };
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { code, message, errors, retry_after } = value as Record<string, unknown>;
  return (
    typeof code === 'string' &&
    typeof message === 'string' &&
    (errors === undefined || (typeof errors === 'object' && errors !== null)) &&
    (retry_after === undefined || typeof retry_after === 'number')
  );
}
