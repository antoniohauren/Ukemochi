import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { formatMoney, LanguageService, type Order, OrderBadges, OrdersStore, TPipe } from 'shared';
import { type Move, nextStatus, OrderBoard } from './order-board';

/**
 * Pedidos: a list of order cards, stage shown as an icon (live through Reverb), each moved forward with one tap;
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
    MatCard,
    MatCardActions,
    MatCardContent,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    NgTemplateOutlet,
    OrderBadges,
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
      <mat-button-toggle value="closed">{{ 'order.stage.done' | t }}</mat-button-toggle>
    </mat-button-toggle-group>

    <ng-template #card let-o>
      <mat-card appearance="outlined" class="card">
        <mat-card-content>
          <div class="head">
            <span class="id">#{{ o.id }}</span>
            <lib-order-badges class="icons" [order]="o" />
          </div>
          <div class="name">{{ o.customer_name }}</div>
          <div class="meta">
            {{ typeKey(o) | t }} · {{ money(o.total_cents) }}
            @if (o.balance_cents > 0 && o.paid_cents > 0) {
              · {{ 'payment.balance' | t }} {{ money(o.balance_cents) }}
            }
          </div>
        </mat-card-content>
        <mat-card-actions align="end">
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
        </mat-card-actions>
      </mat-card>
    </ng-template>

    @if (view() === 'active') {
      @if (store.loadError(); as key) {
        <p class="error" role="alert">{{ key | t }}</p>
        <button matButton="tonal" type="button" (click)="store.load()">
          {{ 'common.retry' | t }}
        </button>
      }
      @if (store.orders(); as orders) {
        <div class="cards">
          @for (o of orders; track o.id) {
            <ng-container *ngTemplateOutlet="card; context: { $implicit: o }" />
          } @empty {
            <p class="empty">{{ 'order.empty' | t }}</p>
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
        <div class="cards">
          @for (o of closed; track o.id) {
            <ng-container *ngTemplateOutlet="card; context: { $implicit: o }" />
          } @empty {
            <p class="empty">{{ 'order.empty' | t }}</p>
          }
        </div>
      }
    }
  `,
  styles: `
    .view {
      margin-bottom: 16px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px;
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

  protected moveKey(to: Move) {
    return `order.move.${to}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
