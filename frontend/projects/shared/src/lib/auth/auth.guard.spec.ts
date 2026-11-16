import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { AuthService } from './auth';
import { authGuard } from './auth.guard';
import type { User } from '../api/user';
import { signal } from '@angular/core';

describe('authGuard', () => {
  const user = signal<User | null>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { user } }],
    });
  });

  const run = () =>
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as boolean | UrlTree;

  it('lets a signed-in user through', () => {
    user.set({ id: 1, name: 'Amanda', role: 'kitchen' });
    expect(run()).toBe(true);
  });

  it('sends a signed-out visitor to login', () => {
    user.set(null);
    const result = run();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
