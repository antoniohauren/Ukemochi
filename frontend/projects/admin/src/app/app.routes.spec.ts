import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService, type Role, type User } from 'shared';
import { routes } from './app.routes';

describe('admin routes', () => {
  const user = signal<User | null>(null);

  beforeEach(() => {
    harness = undefined;
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { user, retryIn: signal(0), logout: vi.fn() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
  });

  const as = (role: Role | null) => user.set(role && { id: 1, name: 'Ana', role });

  let harness: RouterTestingHarness | undefined;

  async function visit(url: string): Promise<{ url: string; el: HTMLElement }> {
    harness ??= await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return { url: TestBed.inject(Router).url, el: harness.routeNativeElement as HTMLElement };
  }

  it('sends a signed-out visitor to login', async () => {
    as(null);
    expect((await visit('/menu')).url).toBe('/login');
  });

  it('lets an admin open every screen, with the full nav', async () => {
    as('admin');
    for (const path of [
      '/orders',
      '/menu',
      '/staff',
      '/cash',
      '/reports',
      '/settings',
      '/audit',
      '/kitchen',
    ]) {
      expect((await visit(path)).url).toBe(path);
    }
    const { el } = await visit('/');
    expect(el.querySelectorAll('.rail-item').length).toBe(8);
  });

  it('keeps kitchen staff on /kitchen, without nav', async () => {
    as('kitchen');
    expect((await visit('/menu')).url).toBe('/kitchen');
    expect((await visit('/')).url).toBe('/kitchen');
    const { url, el } = await visit('/kitchen');
    expect(url).toBe('/kitchen');
    expect(el.querySelectorAll('.rail-item').length).toBe(0);
  });

  it('refuses a waitress with a translated message', async () => {
    as('waitress');
    const { url, el } = await visit('/orders');
    expect(url).toBe('/blocked');
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Este app é para admin e cozinha',
    );
  });
});
