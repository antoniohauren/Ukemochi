import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { activeRouteData, AppShell, type NavItem, TPipe, type TranslationKey } from 'shared';

const NAV: readonly NavItem[] = [
  { path: '/orders', icon: 'receipt_long', label: 'nav.orders' },
  { path: '/new', icon: 'add_circle', label: 'nav.new' },
  { path: '/customers', icon: 'group', label: 'nav.customers' },
  { path: '/more', icon: 'more_horiz', label: 'nav.more' },
];

@Component({
  selector: 'app-layout',
  imports: [AppShell, RouterOutlet, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-app-shell [title]="title() | t" [navItems]="nav">
      <router-outlet />
    </lib-app-shell>
  `,
})
export class Layout {
  protected readonly nav = NAV;
  private readonly data = activeRouteData();
  protected readonly title = computed(
    () => (this.data()['title'] as TranslationKey | undefined) ?? 'app.name',
  );
}
