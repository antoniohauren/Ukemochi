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
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { type Role, TPipe, type TranslationKey } from 'shared';
import { FormDialogTitle } from '../form-dialog';

export interface StaffForm {
  name: string;
  role: Role;
  active: boolean;
  pin: string;
}

/** `create`: every field; `edit`: no PIN; `pin`: only a new PIN. */
export type StaffFormMode = 'create' | 'edit' | 'pin';

export interface StaffFormData {
  mode: StaffFormMode;
  value?: Partial<StaffForm>;
  /** Resolves an error key to show, or null when saved (the dialog then closes). */
  save: (value: StaffForm) => Promise<TranslationKey | null>;
}

export const ROLES: readonly Role[] = ['admin', 'waitress', 'kitchen'];

export function roleKey(role: Role): TranslationKey {
  return `role.${role}`;
}

const TITLES: Record<StaffFormMode, TranslationKey> = {
  create: 'staff.new',
  edit: 'staff.edit',
  pin: 'staff.reset_pin',
};

/** Create/edit a staff member, or reset their PIN. Rules mirror the API's StaffRequest / ResetPinRequest. */
@Component({
  selector: 'app-staff-form-dialog',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    FormDialogTitle,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    MatSlideToggle,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-dialog-title [title]="title" />
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        @if (data.mode !== 'pin') {
          <mat-form-field>
            <mat-label>{{ 'staff.name' | t }}</mat-label>
            <input matInput formControlName="name" maxlength="255" autocomplete="off" />
            <mat-error>{{ 'staff.name.required' | t }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'staff.role' | t }}</mat-label>
            <mat-select formControlName="role">
              @for (role of roles; track role) {
                <mat-option [value]="role">{{ roleKey(role) | t }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-slide-toggle formControlName="active">{{ 'staff.active' | t }}</mat-slide-toggle>
        }
        @if (data.mode !== 'edit') {
          <mat-form-field>
            <mat-label>{{ (data.mode === 'pin' ? 'staff.pin.new' : 'staff.pin') | t }}</mat-label>
            <input
              matInput
              formControlName="pin"
              type="password"
              inputmode="numeric"
              maxlength="4"
              autocomplete="new-password"
            />
            <mat-error>{{ 'staff.pin.invalid' | t }}</mat-error>
          </mat-form-field>
        }
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
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class StaffFormDialog {
  protected readonly data = inject<StaffFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<StaffFormDialog>);
  protected readonly roles = ROLES;
  protected readonly roleKey = roleKey;
  protected readonly title = TITLES[this.data.mode];

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    role: new FormControl<Role>('waitress', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}$/)],
    }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    this.form.patchValue(this.data.value ?? {});
    if (this.data.mode === 'edit') {
      this.form.controls.pin.disable();
    }
    if (this.data.mode === 'pin') {
      this.form.controls.name.disable();
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
    const v = this.form.getRawValue();
    const error = await this.data.save({ ...v, name: v.name.trim() });
    this.busy.set(false);
    if (error) {
      this.error.set(error);
    } else {
      this.ref.close(true);
    }
  }
}
