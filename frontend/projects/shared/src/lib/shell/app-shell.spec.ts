import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AppShell } from './app-shell';
import type { NavItem } from './nav-item';

const items: NavItem[] = [
  { path: '/orders', icon: 'receipt_long', label: 'nav.orders' },
  { path: '/new', icon: 'add', label: 'nav.new' },
  { path: '/more', icon: 'more_horiz', label: 'nav.more' },
];

@Component({
  imports: [AppShell],
  template: `<lib-app-shell title="Pedidos" [navItems]="items" [backLink]="back">
    <button shellActions type="button">Action</button>
    <p>Page</p>
  </lib-app-shell>`,
})
class Host {
  items: NavItem[] = items;
  back: string | null = null;
}

describe('AppShell', () => {
  const breakpoint = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoint } },
      ],
    });
  });

  async function render(handset: boolean, configure?: (host: Host) => void) {
    breakpoint.next({ matches: handset, breakpoints: {} });
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const sidenav = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSidenavHarness);
    return { fixture, el, sidenav };
  }

  it('shows the side nav rail and no bottom tabs on desktop', async () => {
    const { el, sidenav } = await render(false);
    expect(await sidenav.isOpen()).toBe(true);
    expect(el.querySelector('lib-bottom-nav')).toBeNull();
    expect(el.querySelectorAll('.rail-item').length).toBe(3);
  });

  it('shows bottom tabs and hides the rail under 600px', async () => {
    const { el, sidenav } = await render(true);
    expect(await sidenav.isOpen()).toBe(false);
    expect(el.querySelectorAll('lib-bottom-nav .tab').length).toBe(3);
  });

  it('switches layout when the viewport crosses the breakpoint', async () => {
    const { fixture, el, sidenav } = await render(false);
    breakpoint.next({ matches: true, breakpoints: {} });
    await fixture.whenStable();
    expect(await sidenav.isOpen()).toBe(false);
    expect(el.querySelector('lib-bottom-nav')).not.toBeNull();
  });

  it('shows no nav at all without items', async () => {
    const { el, sidenav } = await render(true, (host) => (host.items = []));
    expect(await sidenav.isOpen()).toBe(false);
    expect(el.querySelector('lib-bottom-nav')).toBeNull();
  });

  it('renders title, projected actions, content and an optional back arrow', async () => {
    const { el } = await render(false, (host) => (host.back = '/orders'));
    expect(el.querySelector('h1')?.textContent).toContain('Pedidos');
    expect(el.querySelector('mat-toolbar button')?.textContent).toContain('Action');
    expect(el.querySelector('main')?.textContent).toContain('Page');
    expect(el.querySelector('a[aria-label="Voltar"]')?.getAttribute('href')).toBe('/orders');
  });
});
