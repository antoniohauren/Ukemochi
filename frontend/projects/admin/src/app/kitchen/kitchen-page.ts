import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { formatTime, LanguageService, type Order, OrdersStore, TPipe } from 'shared';
import { OrderBoard } from '../orders/order-board';

/** Cozinha: open orders, oldest first, live through Reverb; one tap marks an order ready. */
@Component({
  selector: 'app-kitchen-page',
  providers: [OrdersStore, OrderBoard],
  imports: [MatButton, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load()">
        {{ 'common.retry' | t }}
      </button>
    }
    @if (queue(); as orders) {
      <div class="queue">
        @for (o of orders; track o.id) {
          <section class="ticket" [attr.aria-label]="'#' + o.id">
            <h2 class="title">#{{ o.id }} · {{ o.customer_name }}</h2>
            <p class="meta">{{ typeKey(o) | t }} · {{ time(o.created_at) }}</p>
            <ul class="lines">
              @for (l of o.lines; track l.id) {
                <li>
                  <strong>{{ l.qty }}×</strong>
                  {{ l.print_name ?? l.item_name + ' · ' + l.variant_name }}
                  @for (a of l.addons; track a.addon_id) {
                    <span class="addon">+ {{ a.name }}</span>
                  }
                  @if (l.note) {
                    <span class="note">{{ l.note }}</span>
                  }
                </li>
              }
            </ul>
            @if (o.note) {
              <p class="note">{{ o.note }}</p>
            }
            <button matButton="filled" type="button" (click)="board.advance(o)">
              {{ 'order.move.ready' | t }}
            </button>
          </section>
        } @empty {
          <p class="meta">{{ 'kitchen.empty' | t }}</p>
        }
      </div>
    }
  `,
  styles: `
    .queue {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .ticket {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container);
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-large);
    }
    .meta {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .lines {
      margin: 0;
      padding: 0;
      list-style: none;
      font: var(--mat-sys-body-large);
      li + li {
        margin-top: 4px;
      }
    }
    .addon,
    .note {
      display: block;
      padding-left: 24px;
      color: var(--mat-sys-on-surface-variant);
    }
    .note {
      font-style: italic;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class KitchenPage {
  protected readonly store = inject(OrdersStore);
  protected readonly board = inject(OrderBoard);
  private readonly lang = inject(LanguageService).lang;

  /** Only what is still to cook; oldest first (ids are sequential). */
  protected readonly queue = computed(() => {
    const orders = this.store.orders();
    return orders === null
      ? null
      : orders.filter((o) => o.status === 'open').sort((a, b) => a.id - b.id);
  });

  constructor() {
    this.store.load();
  }

  protected typeKey(o: Order) {
    return `order.type.${o.type}` as const;
  }

  protected time(iso: string): string {
    return formatTime(iso, this.lang());
  }
}
