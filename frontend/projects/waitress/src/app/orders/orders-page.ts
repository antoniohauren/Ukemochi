import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { formatMoney, LanguageService, type Order, OrderBadges, OrdersStore, TPipe } from 'shared';

/** Pedidos: active orders, newest first, live through Reverb. */
@Component({
  selector: 'app-orders-page',
  providers: [OrdersStore],
  imports: [MatButton, MatCard, MatCardContent, OrderBadges, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load()">
        {{ 'common.retry' | t }}
      </button>
    }
    @if (store.orders(); as orders) {
      <div class="cards">
        @for (o of orders; track o.id) {
          <a class="link" [routerLink]="['/orders', o.id]">
            <mat-card appearance="outlined">
              <mat-card-content>
                <div class="head">
                  <span class="id">#{{ o.id }}</span>
                  <lib-order-badges class="icons" [order]="o" />
                </div>
                <div class="name">{{ o.customer_name }}</div>
                <div class="meta">
                  {{ typeKey(o) | t }} · {{ time(o.created_at) }} · {{ money(o.total_cents) }}
                  @if (o.balance_cents > 0 && o.paid_cents > 0) {
                    · {{ 'payment.balance' | t }} {{ money(o.balance_cents) }}
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </a>
        } @empty {
          <p class="empty">{{ 'order.empty' | t }}</p>
        }
      </div>
    } @else if (!store.loadError()) {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3, 4]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px;
    }
    .link {
      display: block;
      color: inherit;
      text-decoration: none;
      border-radius: var(--mat-sys-corner-medium);
    }
    .link:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .id {
      font: var(--mat-sys-title-medium);
    }
    .icons {
      margin-left: auto;
    }
    .name {
      margin-top: 4px;
      font: var(--mat-sys-body-large);
    }
    .meta {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
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

  protected time(iso: string): string {
    return new Intl.DateTimeFormat(this.lang(), { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
