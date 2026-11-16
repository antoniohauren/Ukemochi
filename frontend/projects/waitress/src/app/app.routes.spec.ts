import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService, type User } from 'shared';
import { routes } from './app.routes';

describe('waitress routes', () => {
  const user = signal<User | null>(null);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { user, retryIn: signal(0), logout: vi.fn() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: true }) } },
      ],
    });
  });

  async function visit(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return { url: TestBed.inject(Router).url, el: harness.routeNativeElement as HTMLElement };
  }

  it('sends a signed-out visitor to login', async () => {
    user.set(null);
    expect((await visit('/orders')).url).toBe('/login');
  });

  it('opens Pedidos with the four bottom tabs for any signed-in role', async () => {
    user.set({ id: 1, name: 'Ana', role: 'kitchen' });
    const { url, el } = await visit('/');
    expect(url).toBe('/orders');
    expect(el.querySelector('h1')?.textContent).toContain('Pedidos');
    const tabs = [...el.querySelectorAll('lib-bottom-nav .label')].map((t) => t.textContent);
    expect(tabs).toEqual(['Pedidos', 'Novo', 'Clientes', 'Mais']);
  });
});
