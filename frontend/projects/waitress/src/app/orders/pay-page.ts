import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, startWith } from 'rxjs';
import {
  type ConfirmData,
  ConfirmDialog,
  formatMoney,
  LanguageService,
  parseMoney,
  type Payment,
  PaymentList,
  type PaymentMethod,
  TPipe,
  type TranslationKey,
} from 'shared';
import { payForm, paymentInput } from './pay-form';
import { type PayMode, PayStore } from './pay-store';

const METHODS: PaymentMethod[] = ['cash', 'pix', 'credit', 'debit'];
const MODES: PayMode[] = ['amount', 'equal', 'items'];

/**
 * Pagar: one payment at a time. The split mode only suggests this payer's amount (from the API);
 * the waitress can still change it. Main action: record the payment.
 */
@Component({
  selector: 'app-pay-page',
  providers: [PayStore],
  imports: [
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    PaymentList,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.data(); as d) {
      <header class="head">
        <h2 class="name">#{{ d.order.id }} · {{ d.order.customer_name }}</h2>
        <p class="meta">
          {{ 'order.total' | t }} {{ money(d.order.total_cents) }} · {{ 'payment.paid' | t }}
          {{ money(d.order.paid_cents) }}
        </p>
        <p class="due">
          {{ (d.order.balance_cents < 0 ? 'payment.overpaid' : 'payment.balance') | t }}
          <strong>{{ money(abs(d.order.balance_cents)) }}</strong>
        </p>
      </header>

      <mat-button-toggle-group
        hideSingleSelectionIndicator
        class="modes"
        [value]="store.mode()"
        (change)="store.setMode($event.value)"
        [attr.aria-label]="'payment.mode' | t"
      >
        @for (m of modes; track m) {
          <mat-button-toggle [value]="m">{{ modeKey(m) | t }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      @switch (store.mode()) {
        @case ('equal') {
          <div class="people">
            <button
              mat-icon-button
              type="button"
              [disabled]="store.n() <= 1"
              [attr.aria-label]="'payment.people.less' | t"
              (click)="store.setN(store.n() - 1)"
            >
              <mat-icon aria-hidden="true">remove</mat-icon>
            </button>
            <span>{{ store.n() }} {{ 'payment.people' | t }}</span>
            <button
              mat-icon-button
              type="button"
              [disabled]="store.n() >= 50"
              [attr.aria-label]="'payment.people.more' | t"
              (click)="store.setN(store.n() + 1)"
            >
              <mat-icon aria-hidden="true">add</mat-icon>
            </button>
          </div>
        }
        @case ('items') {
          <p class="hint">{{ 'payment.pick_hint' | t }}</p>
          @for (l of d.order.lines; track l.id) {
            @let taken = store.picks()[l.id] ?? 0;
            <div class="line">
              <span class="line-name">
                {{ l.qty }}x {{ l.item_name }} · {{ l.variant_name }}
                <span class="meta">{{ money(l.total_cents) }}</span>
              </span>
              <button
                mat-icon-button
                type="button"
                [disabled]="taken === 0"
                [attr.aria-label]="'payment.unit.less' | t"
                (click)="store.setPick(l.id, taken - 1)"
              >
                <mat-icon aria-hidden="true">remove</mat-icon>
              </button>
              <span class="taken" aria-live="polite">{{ taken }}</span>
              <button
                mat-icon-button
                type="button"
                [disabled]="taken >= l.qty"
                [attr.aria-label]="'payment.unit.more' | t"
                (click)="store.setPick(l.id, taken + 1)"
              >
                <mat-icon aria-hidden="true">add</mat-icon>
              </button>
            </div>
          }
        }
      }
      @if (store.previewError(); as key) {
        <p class="error" role="alert">{{ key | t }}</p>
      }
      @if (store.mode() === 'equal' && store.suggestion(); as s) {
        <p class="each">{{ 'payment.each' | t }} {{ money(s.amount_cents) }}</p>
      }
      @if (store.mode() !== 'amount' && store.preview(); as p) {
        @if (p.remainder_cents > 0) {
          <p class="meta">{{ 'payment.remainder' | t }}: {{ money(p.remainder_cents) }}</p>
        }
      }

      <form class="form" [formGroup]="form" (ngSubmit)="pay()">
        <mat-button-toggle-group
          hideSingleSelectionIndicator
          formControlName="method"
          class="methods"
          [attr.aria-label]="'order.pay_method' | t"
        >
          @for (m of methods; track m) {
            <mat-button-toggle [value]="m">{{ methodKey(m) | t }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        <mat-form-field>
          <mat-label>{{ 'payment.amount' | t }}</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" />
          @if (form.controls.amount.invalid) {
            <mat-error>{{ 'error.money.invalid' | t }}</mat-error>
          }
        </mat-form-field>
        @if (method() === 'cash') {
          <mat-form-field>
            <mat-label>{{ 'payment.tendered' | t }}</mat-label>
            <input matInput formControlName="tendered" inputmode="decimal" autocomplete="off" />
            @if (form.hasError('tendered')) {
              <mat-hint class="error">{{ 'payment.invalid_tendered' | t }}</mat-hint>
            }
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>{{ 'payment.payer_label' | t }}</mat-label>
          <input matInput formControlName="payer_label" autocomplete="off" />
          <mat-hint>{{ 'payment.payer_label.hint' | t }}</mat-hint>
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }
        <div class="action-bar">
          <button matButton="filled" type="submit" [disabled]="store.saving()">
            {{ 'payment.record' | t }} {{ amountLabel() }}
          </button>
        </div>
      </form>

      <lib-payment-list [payments]="d.payments" [canVoid]="true" (voidPayment)="(void $event)" />
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
      gap: 8px;
      min-height: 100%;
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-large);
      overflow-wrap: anywhere;
    }
    .meta,
    .hint {
      margin: 4px 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .due {
      margin: 4px 0;
      font: var(--mat-sys-headline-small);
    }
    .each {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .modes,
    .methods {
      width: 100%;
      mat-button-toggle {
        flex: 1;
      }
    }
    .people {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .line {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .line-name {
      flex: 1;
      min-width: 0;
    }
    .line-name {
      display: flex;
      flex-direction: column;
    }
    .taken {
      min-width: 24px;
      text-align: center;
      font: var(--mat-sys-title-medium);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .action-bar {
      position: sticky;
      bottom: 0;
      padding: 8px 0;
      background: var(--mat-sys-surface);
      button {
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
export class PayPage {
  protected readonly store = inject(PayStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly lang = this.language.lang;
  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly methods = METHODS;
  protected readonly modes = MODES;
  protected readonly form = payForm();
  protected readonly error = signal<TranslationKey | null>(null);
  protected readonly method = toSignal(
    this.form.controls.method.valueChanges.pipe(startWith(this.form.controls.method.value)),
    { requireSync: true },
  );
  private readonly amount = toSignal(
    this.form.controls.amount.valueChanges.pipe(startWith(this.form.controls.amount.value)),
    { requireSync: true },
  );
  protected readonly amountLabel = computed(() => {
    const cents = parseMoney(this.amount());
    return cents !== null && cents > 0 ? formatMoney(cents, this.lang()) : '';
  });

  constructor() {
    void this.store.open(this.id);
    // Each new suggestion (balance, equal share, picked items) refills the amount.
    effect(() => {
      const s = this.store.suggestion();
      untracked(() =>
        this.form.controls.amount.setValue(
          s && s.amount_cents > 0 ? formatMoney(s.amount_cents, this.lang()) : '',
        ),
      );
    });
  }

  protected async pay(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.store.saving()) {
      return;
    }
    const allocations =
      this.store.mode() === 'amount' ? [] : (this.store.suggestion()?.allocations ?? []);
    const result = await this.store.pay(paymentInput(this.form, allocations));
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    this.error.set(null);
    this.form.patchValue({ tendered: '', payer_label: '' });
    const t = this.language.t.bind(this.language);
    const change = result.change_cents
      ? ` ${t('payment.change_given')}: ${formatMoney(result.change_cents, this.lang())}`
      : '';
    this.snackBar.open(`${t('payment.recorded')}${change}`, undefined, {
      duration: change ? 10000 : 3000,
    });
    if (result.settled) {
      await this.router.navigate(['/orders', this.id]);
    }
  }

  protected async void(p: Payment): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, {
          data: { message: 'payment.void.confirm', confirm: 'payment.void' },
        })
        .afterClosed(),
    );
    if (!ok) {
      return;
    }
    const key = await this.store.void(p.id);
    this.snackBar.open(this.language.t(key ?? 'payment.voided.done'), undefined, {
      duration: 3000,
    });
  }

  protected modeKey(m: PayMode) {
    return `payment.mode.${m}` as const;
  }

  protected methodKey(m: PaymentMethod) {
    return `payment.method.${m}` as const;
  }

  protected abs(cents: number): number {
    return Math.abs(cents);
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
