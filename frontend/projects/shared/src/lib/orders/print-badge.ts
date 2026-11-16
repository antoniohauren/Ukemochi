import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { PrintStatus } from '../api/order';
import { TPipe } from '../i18n/t.pipe';

/** What the kitchen ticket still needs, as the API reports it; nothing when it is up to date. */
@Component({
  selector: 'lib-print-badge',
  imports: [MatIcon, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status(); as s) {
      <span class="badge" [class.alert]="s !== 'not_printed'">
        <mat-icon aria-hidden="true">print</mat-icon>{{ key(s) | t }}
      </span>
    }
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--mat-sys-corner-full);
      font: var(--mat-sys-label-medium);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .alert {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
  `,
})
export class PrintBadge {
  readonly status = input.required<PrintStatus | null>();

  protected key(s: PrintStatus) {
    return `print.status.${s}` as const;
  }
}
