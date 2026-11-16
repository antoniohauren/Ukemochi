import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService, LangSwitch, TPipe } from 'shared';

@Component({
  selector: 'app-more-page',
  imports: [LangSwitch, MatButton, MatIcon, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="user">{{ auth.user()?.name }}</p>
    <h2 class="label">{{ 'lang.label' | t }}</h2>
    <lib-lang-switch />
    <button mat-stroked-button type="button" class="logout" (click)="auth.logout()">
      <mat-icon aria-hidden="true">logout</mat-icon>
      {{ 'auth.logout' | t }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    .user {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .label {
      margin: 0;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .logout {
      min-height: 48px;
    }
  `,
})
export class MorePage {
  protected readonly auth = inject(AuthService);
}
