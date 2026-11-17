import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  formatMoney,
  LanguageService,
  type Order,
  OrderLines,
  OrderStore,
  type PaymentMethod,
  PrintBadge,
  TPipe,
} from 'shared';
import { CancelDialog, type CancelDialogData } from './cancel-dialog';

/** One order as the API computed it. Main action: pay the balance (edit once paid); the rest sits in the overflow menu. */
@Component({
  selector: 'app-order-page',
  providers: [OrderStore],
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    OrderLines,
    PrintBadge,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.order(); as o) {
      <header class="head">
        <div class="who">
          <h2 class="name">#{{ o.id }} · {{ o.customer_name }}</h2>
          <p class="meta">{{ typeKey(o) | t }} · {{ statusKey(o) | t }}</p>
          <lib-print-badge [status]="o.print_status" />
        </div>
        <button
          mat-icon-button
          type="button"
          [matMenuTriggerFor]="options"
          [attr.aria-label]="'nav.options' | t"
        >
          <mat-icon aria-hidden="true">more_vert</mat-icon>
        </button>
        <mat-menu #options="matMenu">
          @if (o.status !== 'cancelled') {
            <a mat-menu-item [routerLink]="['/orders', o.id, 'edit']">
              <mat-icon aria-hidden="true">edit</mat-icon>
              <span>{{ 'order.edit' | t }}</span>
            </a>
          }
          <a mat-menu-item [routerLink]="['/orders', o.id, 'pay']">
            <mat-icon aria-hidden="true">payments</mat-icon>
            <span>{{ 'payment.list' | t }}</span>
          </a>
          <a mat-menu-item [routerLink]="['/orders', o.id, 'print', 'kitchen']">
            <mat-icon aria-hidden="true">print</mat-icon>
            <span>{{ 'ticket.print.kitchen' | t }}</span>
          </a>
          <a mat-menu-item [routerLink]="['/orders', o.id, 'print', 'bill']">
            <mat-icon aria-hidden="true">receipt_long</mat-icon>
            <span>{{ 'ticket.print.bill' | t }}</span>
          </a>
          @if (o.status !== 'cancelled') {
            <button mat-menu-item type="button" (click)="cancel()">
              <mat-icon aria-hidden="true">cancel</mat-icon>
              <span>{{ 'order.cancel' | t }}</span>
            </button>
          }
        </mat-menu>
      </header>
      @if (o.cancel_reason) {
        <p class="error">{{ 'order.cancel.reason' | t }}: {{ o.cancel_reason }}</p>
      }
      @if (o.type === 'delivery') {
        <p class="detail">{{ o.address_text }}</p>
        @if (o.pay_on_delivery) {
          <p class="detail">
            {{ 'order.pay_on_delivery' | t }}
            @if (o.pay_method) {
              · {{ methodKey(o.pay_method) | t }}
            }
            @if (o.change_for_cents !== null) {
              · {{ 'order.change_for' | t }} {{ money(o.change_for_cents) }}
            }
          </p>
        }
      }
      @if (o.note) {
        <p class="detail note">{{ o.note }}</p>
      }
      <lib-order-lines [lines]="o.lines" />
      <dl class="totals">
        @if (o.delivery_fee_cents > 0) {
          <dt>{{ 'order.subtotal' | t }}</dt>
          <dd>{{ money(o.subtotal_cents) }}</dd>
          <dt>{{ 'order.delivery_fee' | t }}</dt>
          <dd>{{ money(o.delivery_fee_cents) }}</dd>
        }
        <dt class="total">{{ 'order.total' | t }}</dt>
        <dd class="total">{{ money(o.total_cents) }}</dd>
        @if (o.paid_cents !== 0) {
          <dt>{{ 'payment.paid' | t }}</dt>
          <dd>{{ money(o.paid_cents) }}</dd>
          <dt>{{ (o.balance_cents < 0 ? 'payment.overpaid' : 'payment.balance') | t }}</dt>
          <dd>{{ money(abs(o.balance_cents)) }}</dd>
        }
      </dl>
      @if (o.status !== 'cancelled') {
        <div class="action-bar">
          @if (o.balance_cents > 0) {
            <a matButton="filled" [routerLink]="['/orders', o.id, 'pay']">
              {{ 'payment.pay' | t }} {{ money(o.balance_cents) }}
            </a>
          } @else {
            <a matButton="filled" [routerLink]="['/orders', o.id, 'edit']">{{
              'order.edit' | t
            }}</a>
          }
        </div>
      }
    } @else if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.open(id)">
        {{ 'common.retry' | t }}
      </button>
    } @else {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .head {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .who {
      flex: 1;
      min-width: 0;
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-large);
      overflow-wrap: anywhere;
    }
    .meta,
    .detail {
      margin: 4px 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .note {
      font-style: italic;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .totals {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 16px;
      margin: 8px 16px;
    }
    dd {
      margin: 0;
      text-align: end;
    }
    .total {
      font: var(--mat-sys-title-large);
    }
    .action-bar {
      position: sticky;
      bottom: 0;
      margin-top: auto;
      padding: 8px 0;
      background: var(--mat-sys-surface);
      a {
        width: 100%;
        min-height: 48px;
      }
    }
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      .bar {
        height: 56px;
        border-radius: var(--mat-sys-corner-small);
        background: var(--mat-sys-surface-container-high);
      }
    }
  `,
})
export class OrderPage {
  protected readonly store = inject(OrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService).lang;
  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  constructor() {
    this.store.open(this.id);
  }

  protected cancel(): void {
    this.dialog.open<CancelDialog, CancelDialogData>(CancelDialog, {
      data: { cancel: (reason) => this.store.cancel(reason) },
      width: '480px',
      maxWidth: 'calc(100vw - 32px)',
    });
  }

  protected methodKey(method: PaymentMethod) {
    return `payment.method.${method}` as const;
  }

  protected typeKey(o: Order) {
    return `order.type.${o.type}` as const;
  }

  protected statusKey(o: Order) {
    return `order.status.${o.status}` as const;
  }

  protected abs(cents: number): number {
    return Math.abs(cents);
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
