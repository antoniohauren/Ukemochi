import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TPipe, type TranslationKey } from 'shared';

export interface CancelDialogData {
  /** Cancels with the reason; resolves to the error key, or null when done. */
  cancel: (reason: string) => Promise<TranslationKey | null>;
}

/** Asks for the required cancel reason (CancelOrderRequest: reason required, ≤ 1000). */
@Component({
  selector: 'app-cancel-dialog',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'order.cancel' | t }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <mat-form-field class="field">
          <mat-label>{{ 'order.cancel.reason' | t }}</mat-label>
          <textarea matInput formControlName="reason" rows="3" maxlength="1000"></textarea>
          <mat-error>{{ 'order.cancel.reason.required' | t }}</mat-error>
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>{{ 'nav.back' | t }}</button>
        <button matButton="filled" type="submit" [disabled]="busy()">
          {{ 'order.cancel' | t }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .field {
      width: 100%;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class CancelDialog {
  private readonly data = inject<CancelDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef);
  protected readonly form = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)],
    }),
  });
  private readonly reason = this.form.controls.reason;
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  async submit(): Promise<void> {
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    const error = await this.data.cancel(this.reason.value.trim());
    this.busy.set(false);
    if (error === null) {
      this.ref.close(true);
    } else {
      this.error.set(error);
    }
  }
}
