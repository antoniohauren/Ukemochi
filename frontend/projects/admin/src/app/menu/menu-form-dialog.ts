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
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { formatMoney, LanguageService, parseMoney, TPipe, type TranslationKey } from 'shared';

/** What the dialog hands back; fields not shown keep their defaults. */
export interface MenuForm {
  name: string;
  note: string;
  price_cents: number;
  sort: number;
  flag: boolean;
}

export type MenuField = keyof MenuForm;

export interface MenuFormData {
  title: TranslationKey;
  fields: readonly MenuField[];
  value?: Partial<MenuForm>;
  /** Variant names may be empty (the default variant). */
  nameOptional?: boolean;
  flagLabel?: TranslationKey;
  /** Resolves an error key to show, or null when saved (the dialog then closes). */
  save: (value: MenuForm) => Promise<TranslationKey | null>;
}

/** Mirrors the API's `min:0` integer cents rule on a typed amount. */
function moneyValidator(control: AbstractControl<string>): ValidationErrors | null {
  const cents = parseMoney(control.value);
  return cents === null || cents < 0 ? { money: true } : null;
}

/** Create/edit form for categories, items, variants and add-ons. Rules mirror the API FormRequests. */
@Component({
  selector: 'app-menu-form-dialog',
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
    MatSlideToggle,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title | t }}</h2>
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        @if (has('name')) {
          <mat-form-field>
            <mat-label>{{ 'menu.name' | t }}</mat-label>
            <input matInput formControlName="name" maxlength="255" autocapitalize="sentences" />
            <mat-error>{{ 'menu.name.required' | t }}</mat-error>
          </mat-form-field>
        }
        @if (has('note')) {
          <mat-form-field>
            <mat-label>{{ 'menu.note' | t }}</mat-label>
            <textarea matInput formControlName="note" maxlength="1000" rows="2"></textarea>
          </mat-form-field>
        }
        @if (has('price_cents')) {
          <mat-form-field>
            <mat-label>{{ 'menu.price' | t }}</mat-label>
            <input matInput formControlName="price" inputmode="decimal" autocomplete="off" />
            <mat-error>{{ 'menu.price.invalid' | t }}</mat-error>
          </mat-form-field>
        }
        @if (has('sort')) {
          <mat-form-field>
            <mat-label>{{ 'menu.sort' | t }}</mat-label>
            <input matInput formControlName="sort" type="number" inputmode="numeric" min="0" />
            <mat-error>{{ 'menu.sort.invalid' | t }}</mat-error>
          </mat-form-field>
        }
        @if (has('flag') && data.flagLabel) {
          <mat-slide-toggle formControlName="flag">{{ data.flagLabel | t }}</mat-slide-toggle>
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
export class MenuFormDialog {
  protected readonly data = inject<MenuFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MenuFormDialog>);
  private readonly lang = inject(LanguageService).lang;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.maxLength(255),
        ...(this.data.nameOptional ? [] : [Validators.required, Validators.pattern(/\S/)]),
      ],
    }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    price: new FormControl('', { nonNullable: true, validators: [moneyValidator] }),
    sort: new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100000),
      Validators.pattern(/^\d+$/),
    ]),
    flag: new FormControl(true, { nonNullable: true }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    const { price_cents, ...rest } = this.data.value ?? {};
    this.form.patchValue({
      ...rest,
      ...(price_cents !== undefined && { price: formatMoney(price_cents, this.lang()) }),
    });
    if (!this.has('price_cents')) {
      this.form.controls.price.disable();
    }
    if (!this.has('sort')) {
      this.form.controls.sort.disable();
    }
  }

  protected has(field: MenuField): boolean {
    return this.data.fields.includes(field);
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
    const { name, note, price, sort, flag } = this.form.getRawValue();
    const error = await this.data.save({
      name: name.trim(),
      note: note.trim(),
      price_cents: parseMoney(price) ?? 0,
      sort: sort ?? 0,
      flag,
    });
    this.busy.set(false);
    if (error) {
      this.error.set(error);
    } else {
      this.ref.close(true);
    }
  }
}
