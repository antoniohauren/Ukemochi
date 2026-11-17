import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import {
  formatMoney,
  LanguageService,
  maxMoney,
  moneyValidator,
  type MovementKind,
  parseMoney,
  TPipe,
  type TranslationKey,
} from 'shared';
import { FormDialogTitle } from '../form-dialog';

/** `open`: float; `movement`: kind, amount, staff name for a staff meal; `close`: counted cash. */
export type CashFormMode = 'open' | 'movement' | 'close';

export interface CashFormValue {
  kind: MovementKind;
  amount_cents: number;
  staff_name: string | null;
  note: string | null;
}

export interface CashFormData {
  mode: CashFormMode;
  /** Shown on close, so the count can be compared before saving. */
  expectedCents?: number;
  /** Resolves an error key to show, or null when saved (the dialog then closes). */
  save: (value: CashFormValue) => Promise<TranslationKey | null>;
}

export const KINDS: readonly MovementKind[] = ['withdrawal', 'deposit', 'staff_meal'];

const TITLES: Record<CashFormMode, TranslationKey> = {
  open: 'cash.open',
  movement: 'cash.movement.new',
  close: 'cash.close',
};

// ShiftRequest / CashMovementRequest: cents max:100000000; float and count may be 0, a movement not.
const MAX_CENTS = 100_000_000;

function positive(control: AbstractControl<string>): ValidationErrors | null {
  const cents = parseMoney(control.value);
  return cents !== null && cents <= 0 ? { positive: true } : null;
}

function staffNameForMeal(group: AbstractControl): ValidationErrors | null {
  const kind = group.get('kind')?.value as MovementKind;
  const name = (group.get('staff_name')?.value as string).trim();
  return kind === 'staff_meal' && name === '' ? { staffName: true } : null;
}

@Component({
  selector: 'app-cash-form-dialog',
  imports: [
    FormDialogTitle,
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatError,
    MatFormField,
    MatHint,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-dialog-title [title]="title" />
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        @if (data.mode === 'movement') {
          <mat-form-field>
            <mat-label>{{ 'cash.movement.kind' | t }}</mat-label>
            <mat-select formControlName="kind">
              @for (k of kinds; track k) {
                <mat-option [value]="k">{{ kindKey(k) | t }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>{{ amountLabel | t }}</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" />
          @if (data.mode === 'close' && data.expectedCents !== undefined) {
            <mat-hint>{{ 'cash.expected' | t }} {{ money(data.expectedCents) }}</mat-hint>
          }
          <mat-error>{{ 'error.money.invalid' | t }}</mat-error>
        </mat-form-field>
        @if (data.mode === 'movement' && form.controls.kind.value === 'staff_meal') {
          <mat-form-field>
            <mat-label>{{ 'cash.staff_name' | t }}</mat-label>
            <input matInput formControlName="staff_name" maxlength="255" autocomplete="off" />
            @if (form.hasError('staffName') && form.controls.staff_name.touched) {
              <mat-hint class="error">{{ 'error.cash.staff_name_required' | t }}</mat-hint>
            }
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>{{ 'order.note' | t }}</mat-label>
          <input matInput formControlName="note" maxlength="1000" autocomplete="off" />
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | t }}</button>
        <button mat-flat-button type="submit" [disabled]="busy()">{{ 'common.save' | t }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class CashFormDialog {
  protected readonly data = inject<CashFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CashFormDialog>);
  private readonly lang = inject(LanguageService).lang;
  protected readonly kinds = KINDS;
  protected readonly title = TITLES[this.data.mode];
  protected readonly amountLabel: TranslationKey =
    this.data.mode === 'open'
      ? 'cash.opening_float'
      : this.data.mode === 'close'
        ? 'cash.counted'
        : 'payment.amount';
  protected readonly error = signal<TranslationKey | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = new FormGroup(
    {
      kind: new FormControl<MovementKind>('withdrawal', { nonNullable: true }),
      amount: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          moneyValidator,
          maxMoney(MAX_CENTS),
          ...(this.data.mode === 'movement' ? [positive] : []),
        ],
      }),
      staff_name: new FormControl('', { nonNullable: true }),
      note: new FormControl('', { nonNullable: true }),
    },
    { validators: this.data.mode === 'movement' ? staffNameForMeal : null },
  );

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) {
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    const key = await this.data.save({
      kind: v.kind,
      amount_cents: parseMoney(v.amount) ?? 0,
      staff_name: v.kind === 'staff_meal' ? v.staff_name.trim() : null,
      note: v.note.trim() || null,
    });
    this.busy.set(false);
    if (key === null) {
      this.ref.close();
    }
    this.error.set(key);
  }

  protected kindKey(k: MovementKind) {
    return `cash.kind.${k}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
