import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { Payment } from '../api/payment';
import { LanguageService } from '../i18n/language';
import { TPipe } from '../i18n/t.pipe';
import { formatMoney } from '../money/money';

/** An order's payments as the API stored them; voided ones struck through. Emits the payment to void. */
@Component({
  selector: 'lib-payment-list',
  imports: [MatIcon, MatIconButton, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (payments().length > 0) {
      <h3 class="title">{{ 'payment.list' | t }}</h3>
      <ul class="list">
        @for (p of payments(); track p.id) {
          <li class="row" [class.voided]="p.voided">
            <div class="text">
              <span
                >{{ methodKey(p) | t }}
                @if (p.payer_label) {
                  · {{ p.payer_label }}
                }
              </span>
              @if (p.voided) {
                <span class="meta">{{ 'payment.voided' | t }}</span>
              } @else if (p.change_cents) {
                <span class="meta">{{ 'ticket.change' | t }} {{ money(p.change_cents) }}</span>
              }
            </div>
            <span class="amount">{{ money(p.amount_cents) }}</span>
            @if (canVoid() && !p.voided) {
              <button
                mat-icon-button
                type="button"
                [attr.aria-label]="'payment.void' | t"
                (click)="voidPayment.emit(p)"
              >
                <mat-icon aria-hidden="true">undo</mat-icon>
              </button>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .title {
      margin: 16px 0 0;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .voided .amount {
      text-decoration: line-through;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PaymentList {
  readonly payments = input.required<Payment[]>();
  readonly canVoid = input(false);
  readonly voidPayment = output<Payment>();
  private readonly lang = inject(LanguageService).lang;

  protected methodKey(p: Payment) {
    return `payment.method.${p.method}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
