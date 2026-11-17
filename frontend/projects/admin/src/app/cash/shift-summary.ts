import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  type CashMovement,
  formatDateTime,
  formatMoney,
  formatTime,
  LanguageService,
  type PaymentMethod,
  type Shift,
  TPipe,
} from 'shared';

const METHODS: PaymentMethod[] = ['cash', 'pix', 'credit', 'debit'];

/** A shift's money as the API computed it, with its movements. */
@Component({
  selector: 'app-shift-summary',
  imports: [TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = shift();
    <p class="meta">
      {{ 'cash.opened_at' | t }} {{ at(s.opened_at) }} ·
      {{ name(s.opened_by) }}
      @if (s.closed_at && s.closed_by) {
        <br />
        {{ 'cash.closed_at' | t }} {{ at(s.closed_at) }} ·
        {{ name(s.closed_by) }}
      }
    </p>
    @if (s.note) {
      <p class="meta note">{{ s.note }}</p>
    }
    <dl class="sums">
      <dt>{{ 'cash.opening_float' | t }}</dt>
      <dd>{{ money(s.opening_float_cents) }}</dd>
      <dt>{{ 'cash.cash_payments' | t }}</dt>
      <dd>{{ money(s.totals_by_method.cash) }}</dd>
      <dt>{{ 'cash.kind.withdrawal' | t }}</dt>
      <dd>− {{ money(s.withdrawals_cents) }}</dd>
      <dt>{{ 'cash.kind.staff_meal' | t }}</dt>
      <dd>− {{ money(s.staff_meals_cents) }}</dd>
      <dt>{{ 'cash.kind.deposit' | t }}</dt>
      <dd>{{ money(s.deposits_cents) }}</dd>
      <dt class="big">{{ 'cash.expected' | t }}</dt>
      <dd class="big">{{ money(s.expected_cents) }}</dd>
      @if (s.counted_cents !== null && s.difference_cents !== null) {
        <dt>{{ 'cash.counted' | t }}</dt>
        <dd>{{ money(s.counted_cents) }}</dd>
        <dt>{{ 'cash.difference' | t }}</dt>
        <dd [class.error]="s.difference_cents < 0">{{ money(s.difference_cents) }}</dd>
      }
    </dl>
    <h3 class="title">{{ 'cash.by_method' | t }}</h3>
    <dl class="sums">
      @for (m of methods; track m) {
        <dt>{{ methodKey(m) | t }}</dt>
        <dd>{{ money(s.totals_by_method[m]) }}</dd>
      }
    </dl>
    @if (s.movements.length > 0) {
      <h3 class="title">{{ 'cash.movements' | t }}</h3>
      <ul class="movements">
        @for (m of s.movements; track m.id) {
          <li>
            <span class="what">
              {{ kindKey(m) | t }}
              @if (m.staff_name) {
                · {{ m.staff_name }}
              }
              <span class="meta">
                {{ time(m.created_at) }} · {{ name(m.created_by) }}
                @if (m.note) {
                  · {{ m.note }}
                }
              </span>
            </span>
            <span>{{ money(m.amount_cents) }}</span>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .meta {
      margin: 4px 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .note {
      font-style: italic;
    }
    .title {
      margin: 16px 0 4px;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .sums {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 16px;
      margin: 8px 0;
      max-width: 480px;
    }
    dd {
      margin: 0;
      text-align: end;
    }
    .big {
      font: var(--mat-sys-title-medium);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .movements {
      margin: 0;
      padding: 0;
      list-style: none;
      max-width: 480px;
      li {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        min-height: 48px;
        align-items: center;
      }
    }
    .what {
      display: flex;
      flex-direction: column;
    }
  `,
})
export class ShiftSummary {
  readonly shift = input.required<Shift>();
  /** Staff names by user id. */
  readonly names = input<Record<number, string>>({});
  private readonly lang = inject(LanguageService).lang;
  protected readonly methods = METHODS;

  protected at(iso: string): string {
    return formatDateTime(iso, this.lang());
  }

  protected time(iso: string): string {
    return formatTime(iso, this.lang());
  }

  protected name(id: number): string {
    return this.names()[id] ?? `#${id}`;
  }

  protected kindKey(m: CashMovement) {
    return `cash.kind.${m.kind}` as const;
  }

  protected methodKey(m: PaymentMethod) {
    return `payment.method.${m}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
