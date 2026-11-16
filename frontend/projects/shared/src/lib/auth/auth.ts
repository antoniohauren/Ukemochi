import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, interval, type Subscription, take, timeout } from 'rxjs';
import { ApiClient, type ApiError } from '../api/api-client';
import type { LoginRequest, User } from '../api/user';

/** Session state of the signed-in staff member (Sanctum cookie session). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly current = signal<User | null>(null);
  readonly user = this.current.asReadonly();
  private readonly retryLeft = signal(0);
  /** Seconds before another login attempt is allowed after `auth.throttled`. */
  readonly retryIn = this.retryLeft.asReadonly();
  private countdown?: Subscription;

  /** Loads the session user on startup; any failure or a stalled network (5s) means logged out. */
  async restore(): Promise<void> {
    try {
      this.current.set(await firstValueFrom(this.api.get<User>('/me').pipe(timeout(5000))));
    } catch {
      this.current.set(null);
    }
  }

  /** Rejects with an `ApiError` (wrong PIN, throttled, network); throttled starts `retryIn`. */
  async login(name: string, pin: string): Promise<User> {
    try {
      await firstValueFrom(this.api.csrfCookie());
      const body: LoginRequest = { name, pin };
      const user = await firstValueFrom(this.api.post<User>('/login', body));
      this.current.set(user);
      return user;
    } catch (e) {
      const error = e as ApiError;
      if (error.code === 'auth.throttled' && error.retry_after !== undefined) {
        this.startCountdown(error.retry_after);
      }
      throw error;
    }
  }

  /** Shows logged out even if the server is unreachable; its session then idles out. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<null>('/logout'));
    } catch {
      // ignored on purpose: see above
    }
    this.signedOut();
  }

  /** Clears the user and goes to login (logout, or a 401 from the server). */
  signedOut(): void {
    this.current.set(null);
    void this.router.navigate(['/login']);
  }

  private startCountdown(seconds: number): void {
    this.countdown?.unsubscribe();
    this.retryLeft.set(seconds);
    this.countdown = interval(1000)
      .pipe(take(seconds))
      .subscribe(() => this.retryLeft.update((left) => left - 1));
  }
}
