import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
  MatNavList,
} from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { formatMoney, LanguageService, type Order, TPipe } from 'shared';
import { OrdersStore } from './orders-store';

/** Pedidos: active orders, newest first, live through Reverb. */
@Component({
  selector: 'app-orders-page',
  providers: [OrdersStore],
  imports: [
    MatButton,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    MatNavList,
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
      <mat-nav-list>
        @for (o of orders; track o.id) {
          <a mat-list-item [routerLink]="['/orders', o.id]">
            <span matListItemTitle>#{{ o.id }} · {{ o.customer_name }}</span>
            <span matListItemLine>
              {{ typeKey(o) | t }} · {{ statusKey(o) | t }} · {{ time(o.created_at) }}
            </span>
            <span matListItemMeta class="total">{{ money(o.total_cents) }}</span>
          </a>
        } @empty {
          <p class="empty">{{ 'order.empty' | t }}</p>
        }
      </mat-nav-list>
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
      min-height: 64px;
    }
    .total {
      align-self: center;
      color: var(--mat-sys-on-surface);
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
        height: 64px;
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

  protected time(iso: string): string {
    return new Intl.DateTimeFormat(this.lang(), { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
