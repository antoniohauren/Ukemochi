import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { TPipe } from '../i18n/t.pipe';
import type { NavItem } from './nav-item';

const MAX_TABS = 5;

/** Mobile bottom tab bar. Over 5 items, the 5th tab becomes a "more" menu with the rest. */
@Component({
  selector: 'lib-bottom-nav',
  imports: [MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, RouterLink, RouterLinkActive, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  readonly items = input.required<readonly NavItem[]>();
  protected readonly tabs = computed(() => {
    const items = this.items();
    return items.length > MAX_TABS ? items.slice(0, MAX_TABS - 1) : items;
  });
  protected readonly overflow = computed(() => {
    const items = this.items();
    return items.length > MAX_TABS ? items.slice(MAX_TABS - 1) : [];
  });

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** The menu items are not rendered, so routerLinkActive cannot mark the "more" tab. */
  protected readonly overflowActive = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return this.overflow().some((item) => path === item.path || path.startsWith(`${item.path}/`));
  });
}
