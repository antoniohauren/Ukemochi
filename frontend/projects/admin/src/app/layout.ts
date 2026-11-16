import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterOutlet } from '@angular/router';
import {
  activeRouteData,
  AppShell,
  AuthService,
  type NavItem,
  TPipe,
  type TranslationKey,
} from 'shared';

const NAV: readonly NavItem[] = [
  { path: '/orders', icon: 'receipt_long', label: 'nav.orders' },
  { path: '/menu', icon: 'restaurant_menu', label: 'nav.menu' },
  { path: '/kitchen', icon: 'soup_kitchen', label: 'nav.kitchen' },
  { path: '/cash', icon: 'point_of_sale', label: 'nav.cash' },
  { path: '/reports', icon: 'bar_chart', label: 'nav.reports' },
  { path: '/staff', icon: 'badge', label: 'nav.staff' },
  { path: '/audit', icon: 'history', label: 'nav.audit' },
  { path: '/settings', icon: 'settings', label: 'nav.settings' },
];

@Component({
  selector: 'app-layout',
  imports: [
    AppShell,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    RouterOutlet,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-app-shell [title]="title() | t" [navItems]="nav()">
      <button
        shellActions
        mat-icon-button
        type="button"
        [matMenuTriggerFor]="options"
        [attr.aria-label]="'nav.options' | t"
      >
        <mat-icon aria-hidden="true">more_vert</mat-icon>
      </button>
      <mat-menu #options="matMenu">
        <button mat-menu-item type="button" (click)="auth.logout()">
          <mat-icon aria-hidden="true">logout</mat-icon>
          <span>{{ 'auth.logout' | t }}</span>
        </button>
      </mat-menu>
      <router-outlet />
    </lib-app-shell>
  `,
})
export class Layout {
  protected readonly auth = inject(AuthService);
  /** Kitchen only has `/kitchen`, so it gets no nav. */
  protected readonly nav = computed(() => (this.auth.user()?.role === 'admin' ? NAV : []));
  private readonly data = activeRouteData();
  protected readonly title = computed(
    () => (this.data()['title'] as TranslationKey | undefined) ?? 'app.name',
  );
}
