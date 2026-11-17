import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { formatMoney, LanguageService, type Order, OrdersStore, PrintBadge, TPipe } from 'shared';

/** Pedidos: active orders, live through Reverb, with their print state and print actions. */
@Component({
  selector: 'app-orders-page',
  providers: [OrdersStore],
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    MatList,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    PrintBadge,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load()">
        {{ 'common.retry' | t }}
      </button>
    }
    @if (store.orders(); as orders) {
      <mat-list>
        @for (o of orders; track o.id) {
          <mat-list-item>
            <span matListItemTitle>#{{ o.id }} · {{ o.customer_name }}</span>
            <span matListItemLine>
              {{ typeKey(o) | t }} · {{ statusKey(o) | t }} · {{ money(o.total_cents) }}
            </span>
            @if (o.print_status) {
              <span matListItemLine><lib-print-badge [status]="o.print_status" /></span>
            }
            <span matListItemMeta class="actions">
              <a
                mat-icon-button
                [routerLink]="['/orders', o.id, 'print', 'kitchen']"
                [attr.aria-label]="'ticket.print.kitchen' | t"
              >
                <mat-icon aria-hidden="true">print</mat-icon>
              </a>
              <a
                mat-icon-button
                [routerLink]="['/orders', o.id, 'print', 'bill']"
                [attr.aria-label]="'ticket.print.bill' | t"
              >
                <mat-icon aria-hidden="true">receipt_long</mat-icon>
              </a>
            </span>
          </mat-list-item>
        } @empty {
          <p class="empty">{{ 'order.empty' | t }}</p>
        }
      </mat-list>
    } @else if (!store.loadError()) {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3, 4]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
  `,
  styles: `
    .mat-mdc-list-item {
      height: auto;
      min-height: 72px;
    }
    .actions {
      display: flex;
      align-self: center;
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      .bar {
        height: 72px;
        border-radius: var(--mat-sys-corner-small);
        background: var(--mat-sys-surface-container-high);
      }
    }
  `,
})
export class OrdersPage {
  protected readonly store = inject(OrdersStore);
  private readonly lang = inject(LanguageService).lang;

  constructor() {
    this.store.load();
  }

  protected typeKey(o: Order) {
    return `order.type.${o.type}` as const;
  }

  protected statusKey(o: Order) {
    return `order.status.${o.status}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
