import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { TPipe } from '../i18n/t.pipe';
import { BottomNav } from './bottom-nav';
import type { NavItem } from './nav-item';

/**
 * Page frame: top app bar (title, optional back arrow, `[shellActions]` slot), the page as content,
 * bottom tabs under 600px and a side nav rail above. No nav when `navItems` is empty.
 */
@Component({
  selector: 'lib-app-shell',
  imports: [
    BottomNav,
    MatIcon,
    MatIconButton,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatToolbar,
    RouterLink,
    RouterLinkActive,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly title = input.required<string>();
  readonly navItems = input<readonly NavItem[]>([]);
  readonly backLink = input<string | null>(null);

  protected readonly handset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly hasNav = computed(() => this.navItems().length > 0);
}
