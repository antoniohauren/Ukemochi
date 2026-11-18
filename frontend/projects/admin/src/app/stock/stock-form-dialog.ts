import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { type StockLevel, TPipe, type TranslationKey } from 'shared';
import { FormDialogTitle } from '../form-dialog';

export interface StockForm {
  track: boolean;
  min: number | null;
  qty: number | null;
  note: string;
}

/** `settings`: tracking and minimum; `purchase`: units bought; `count`: units counted. */
export type StockFormMode = 'settings' | 'purchase' | 'count';

export interface StockFormData {
  mode: StockFormMode;
  level: StockLevel;
  /** Resolves an error key to show, or null when saved (the dialog then closes). */
  save: (value: StockForm) => Promise<TranslationKey | null>;
}

const TITLES: Record<StockFormMode, TranslationKey> = {
  settings: 'stock.settings',
  purchase: 'stock.purchase',
  count: 'stock.count',
};

const MAX = 1_000_000;

/** Stock settings, purchase or count of one variant. Rules mirror StockConfigRequest / StockMovementRequest. */
@Component({
  selector: 'app-stock-form-dialog',
  imports: [
    FormDialogTitle,
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    MatSlideToggle,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-dialog-title [title]="title" />
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        <p class="name">{{ name }}</p>
        @if (data.mode === 'settings') {
          <mat-slide-toggle formControlName="track">{{ 'stock.track' | t }}</mat-slide-toggle>
          <mat-form-field>
            <mat-label>{{ 'stock.min' | t }}</mat-label>
            <input matInput formControlName="min" type="number" inputmode="numeric" min="0" />
            <mat-error>{{ 'stock.qty.invalid' | t }}</mat-error>
          </mat-form-field>
        } @else {
          <mat-form-field>
            <mat-label>{{
              (data.mode === 'purchase' ? 'stock.purchase.qty' : 'stock.count.qty') | t
            }}</mat-label>
            <input matInput formControlName="qty" type="number" inputmode="numeric" min="0" />
            <mat-error>{{ 'stock.qty.invalid' | t }}</mat-error>
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>{{ 'stock.note' | t }}</mat-label>
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
    .form {
      display: contents;
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-small);
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class StockFormDialog {
  protected readonly data = inject<StockFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<StockFormDialog>);
  protected readonly title = TITLES[this.data.mode];
  protected readonly name = [this.data.level.item_name, this.data.level.variant_name]
    .filter(Boolean)
    .join(' · ');

  protected readonly form = new FormGroup({
    track: new FormControl(this.data.level.track_stock, { nonNullable: true }),
    min: new FormControl<number | null>(this.data.level.stock_min, {
      validators: [Validators.min(0), Validators.max(MAX), Validators.pattern(/^\d+$/)],
    }),
    qty: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(this.data.mode === 'purchase' ? 1 : 0),
        Validators.max(MAX),
        Validators.pattern(/^\d+$/),
      ],
    }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    if (this.data.mode === 'settings') {
      this.form.controls.qty.disable();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const error = await this.data.save(this.form.getRawValue());
    this.busy.set(false);
    if (error) {
      this.error.set(error);
    } else {
      this.ref.close(true);
    }
  }
}
