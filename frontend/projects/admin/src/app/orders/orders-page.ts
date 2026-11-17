import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import {
  formatMoney,
  LanguageService,
  type Order,
  type OrderStatus,
  OrdersStore,
  PrintBadge,
  TPipe,
} from 'shared';
import { type Move, nextStatus, OrderBoard } from './order-board';

const ACTIVE: OrderStatus[] = ['open', 'ready', 'out_for_delivery'];

/**
 * Pedidos: a board of active orders by status (live through Reverb), each moved forward with one tap;
 * closed orders can be edited (which reopens them) or reopened.
 */
@Component({
  selector: 'app-orders-page',
  providers: [OrdersStore, OrderBoard],
  imports: [
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIcon,
    MatIconButton,
    MatList,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    NgTemplateOutlet,
    PrintBadge,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      hideSingleSelectionIndicator
      class="view"
      [value]="view()"
      (change)="show($event.value)"
      [attr.aria-label]="'nav.orders' | t"
    >
      <mat-button-toggle value="active">{{ 'order.board.active' | t }}</mat-button-toggle>
      <mat-button-toggle value="closed">{{ 'order.status.closed' | t }}</mat-button-toggle>
    </mat-button-toggle-group>

    <ng-template #row let-o>
      <mat-list-item>
        <span matListItemTitle>#{{ o.id }} · {{ o.customer_name }}</span>
        <span matListItemLine>
          {{ typeKey(o) | t }} · {{ money(o.total_cents) }}
          @if (o.balance_cents > 0 && o.paid_cents > 0) {
            · {{ 'payment.balance' | t }} {{ money(o.balance_cents) }}
          }
        </span>
        @if (o.print_status) {
          <span matListItemLine><lib-print-badge [status]="o.print_status" /></span>
        }
        <span matListItemMeta class="actions">
          @if (next(o); as to) {
            <button matButton="tonal" type="button" (click)="board.advance(o)">
              {{ moveKey(to) | t }}
            </button>
          }
          <button
            mat-icon-button
            type="button"
            [matMenuTriggerFor]="options"
            [attr.aria-label]="'nav.options' | t"
          >
            <mat-icon aria-hidden="true">more_vert</mat-icon>
          </button>
          <mat-menu #options="matMenu">
            <a mat-menu-item [routerLink]="['/orders', o.id, 'edit']">
              <mat-icon aria-hidden="true">edit</mat-icon>
              <span>{{ 'order.edit' | t }}</span>
            </a>
            @if (o.status === 'closed') {
              <button mat-menu-item type="button" (click)="board.reopen(o)">
                <mat-icon aria-hidden="true">undo</mat-icon>
                <span>{{ 'order.reopen' | t }}</span>
              </button>
            }
            <a mat-menu-item [routerLink]="['/orders', o.id, 'print', 'kitchen']">
              <mat-icon aria-hidden="true">print</mat-icon>
              <span>{{ 'ticket.print.kitchen' | t }}</span>
            </a>
            <a mat-menu-item [routerLink]="['/orders', o.id, 'print', 'bill']">
              <mat-icon aria-hidden="true">receipt_long</mat-icon>
              <span>{{ 'ticket.print.bill' | t }}</span>
            </a>
          </mat-menu>
        </span>
      </mat-list-item>
    </ng-template>

    @if (view() === 'active') {
      @if (store.loadError(); as key) {
        <p class="error" role="alert">{{ key | t }}</p>
        <button matButton="tonal" type="button" (click)="store.load()">
          {{ 'common.retry' | t }}
        </button>
      }
      @if (byStatus(); as groups) {
        <div class="board">
          @for (g of groups; track g.status) {
            <section class="column">
              <h3 class="title">{{ statusKey(g.status) | t }} ({{ g.orders.length }})</h3>
              <mat-list>
                @for (o of g.orders; track o.id) {
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: o }" />
                } @empty {
                  <p class="empty">{{ 'order.empty' | t }}</p>
                }
              </mat-list>
            </section>
          }
        </div>
      } @else if (!store.loadError()) {
        <div class="skeleton" aria-hidden="true">
          @for (bar of [1, 2, 3]; track bar) {
            <span class="bar"></span>
          }
        </div>
      }
    } @else {
      @if (board.closedError(); as key) {
        <p class="error" role="alert">{{ key | t }}</p>
      }
      @if (board.closed(); as closed) {
        <mat-list>
          @for (o of closed; track o.id) {
            <ng-container *ngTemplateOutlet="row; context: { $implicit: o }" />
          } @empty {
            <p class="empty">{{ 'order.empty' | t }}</p>
          }
        </mat-list>
      }
    }
  `,
  styles: `
    .view {
      margin-bottom: 16px;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .mat-mdc-list-item {
      height: auto;
      min-height: 72px;
    }
    .actions {
      display: flex;
      align-items: center;
      align-self: center;
      gap: 4px;
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
  protected readonly board = inject(OrderBoard);
  private readonly lang = inject(LanguageService).lang;
  protected readonly view = signal<'active' | 'closed'>('active');
  protected readonly next = nextStatus;

  protected readonly byStatus = computed(() => {
    const orders = this.store.orders();
    return orders === null
      ? null
      : ACTIVE.map((status) => ({ status, orders: orders.filter((o) => o.status === status) }));
  });

  constructor() {
    this.store.load();
  }

  protected show(view: 'active' | 'closed'): void {
    this.view.set(view);
    if (view === 'closed') {
      void this.board.loadClosed();
    }
  }

  protected typeKey(o: Order) {
    return `order.type.${o.type}` as const;
  }

  protected statusKey(s: OrderStatus) {
    return `order.status.${s}` as const;
  }

  protected moveKey(to: Move) {
    return `order.move.${to}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
