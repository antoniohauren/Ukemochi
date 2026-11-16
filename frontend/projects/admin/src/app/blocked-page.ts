import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { AppShell, AuthService, TPipe } from 'shared';

/** Shown to a waitress who signs in to the admin app. */
@Component({
  selector: 'app-blocked-page',
  imports: [AppShell, MatButton, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-app-shell [title]="'auth.blocked.title' | t">
      <p role="alert">{{ 'auth.blocked.message' | t }}</p>
      <button mat-flat-button type="button" class="logout" (click)="auth.logout()">
        {{ 'auth.logout' | t }}
      </button>
    </lib-app-shell>
  `,
  styles: `
    .logout {
      min-height: 48px;
    }
  `,
})
export class BlockedPage {
  protected readonly auth = inject(AuthService);
}
