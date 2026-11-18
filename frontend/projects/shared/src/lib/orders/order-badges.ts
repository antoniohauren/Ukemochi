import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { Order, PrintStatus } from '../api/order';
import { TPipe } from '../i18n/t.pipe';

/** What an order card shows; derived from status and print state; payment shows separately (no API status of its own). */
export type Stage = 'open' | 'production' | 'left' | 'done';

export function stageOf(o: Pick<Order, 'status' | 'print_status'>): Stage {
  if (o.status === 'closed' || o.status === 'cancelled') {
    return 'done';
  }
  if (o.status === 'out_for_delivery') {
    return 'left';
  }
  return o.status === 'open' && o.print_status === 'not_printed' ? 'open' : 'production';
}

const STAGE_ICONS: Record<Stage, string> = {
  open: 'schedule',
  production: 'skillet',
  left: 'two_wheeler',
  done: 'check_circle',
};

const PRINT_ICONS: Record<PrintStatus, string> = {
  not_printed: 'print_disabled',
  changed: 'edit_note',
  cancel_not_printed: 'cancel',
};

/** Print, paid and stage icons of one order, each with a tooltip and an accessible label. */
@Component({
  selector: 'lib-order-badges',
  imports: [MatIcon, MatTooltip, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (order().print_status; as p) {
      <mat-icon
        class="print"
        [matTooltip]="printKey(p) | t"
        [attr.aria-label]="printKey(p) | t"
        role="img"
        >{{ printIcon(p) }}</mat-icon
      >
    }
    @if (paid()) {
      <mat-icon
        class="paid"
        [matTooltip]="'order.stage.paid' | t"
        [attr.aria-label]="'order.stage.paid' | t"
        role="img"
        >paid</mat-icon
      >
    }
    <mat-icon
      class="stage"
      [class]="stage()"
      [matTooltip]="stageKey() | t"
      [attr.aria-label]="stageKey() | t"
      role="img"
      >{{ stageIcon() }}</mat-icon
    >
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 4px;
    }
    .stage {
      color: var(--mat-sys-on-surface-variant);
    }
    .stage.production {
      color: var(--mat-sys-tertiary);
    }
    .stage.left {
      color: var(--mat-sys-secondary);
    }
    .paid {
      color: var(--mat-sys-primary);
    }
    .print {
      color: var(--mat-sys-error);
    }
  `,
})
export class OrderBadges {
  readonly order =
    input.required<Pick<Order, 'status' | 'print_status' | 'balance_cents' | 'paid_cents'>>();

  protected readonly stage = computed(() => stageOf(this.order()));
  protected readonly stageIcon = computed(() => STAGE_ICONS[this.stage()]);
  protected readonly stageKey = computed(() => `order.stage.${this.stage()}` as const);
  protected readonly paid = computed(
    () => this.order().balance_cents <= 0 && this.order().paid_cents > 0,
  );

  protected printIcon(p: PrintStatus): string {
    return PRINT_ICONS[p];
  }

  protected printKey(p: PrintStatus) {
    return `print.status.${p}` as const;
  }
}
