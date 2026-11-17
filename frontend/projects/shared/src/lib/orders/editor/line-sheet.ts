import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { type LineAddon } from '../../api/order';
import { LanguageService } from '../../i18n/language';
import { TPipe } from '../../i18n/t.pipe';
import { formatMoney } from '../../money/money';
import { type DraftLine, lineName } from '../../orders/order-draft';

export interface LineSheetData {
  line: DraftLine;
  /** Add-ons the line can take (see `addonOptions`). */
  options: LineAddon[];
  /** A saved or already added line can be removed. */
  removable: boolean;
}

/** Dismissed with the edited line, `'remove'`, or nothing (closed). */
export type LineSheetResult = DraftLine | 'remove' | undefined;

/** Qty, add-ons and note of one line. Rules mirror OrderRequest: qty 1–999, note ≤ 1000. */
@Component({
  selector: 'lib-line-sheet',
  imports: [
    MatButton,
    MatCheckbox,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <h2 class="title">{{ title }}</h2>
      <div class="qty">
        <button
          mat-icon-button
          type="button"
          (click)="step(-1)"
          [attr.aria-label]="'order.line.less' | t"
        >
          <mat-icon aria-hidden="true">remove</mat-icon>
        </button>
        <mat-form-field class="qty-field">
          <mat-label>{{ 'order.line.qty' | t }}</mat-label>
          <input
            matInput
            formControlName="qty"
            type="number"
            inputmode="numeric"
            min="1"
            max="999"
          />
          <mat-error>{{ 'order.line.qty.invalid' | t }}</mat-error>
        </mat-form-field>
        <button
          mat-icon-button
          type="button"
          (click)="step(1)"
          [attr.aria-label]="'order.line.more' | t"
        >
          <mat-icon aria-hidden="true">add</mat-icon>
        </button>
      </div>
      @if (data.options.length) {
        <fieldset class="addons" formArrayName="addons">
          <legend class="legend">{{ 'menu.addons' | t }}</legend>
          @for (a of data.options; track a.addon_id; let i = $index) {
            <mat-checkbox [formControlName]="i">
              {{ a.name }} (+{{ money(a.price_cents) }})
            </mat-checkbox>
          }
        </fieldset>
      }
      <mat-form-field>
        <mat-label>{{ 'order.line.note' | t }}</mat-label>
        <textarea matInput formControlName="note" rows="2" maxlength="1000"></textarea>
        <mat-error>{{ 'menu.note.invalid' | t }}</mat-error>
      </mat-form-field>
      <div class="actions">
        @if (data.removable) {
          <button matButton type="button" (click)="ref.dismiss('remove')">
            {{ 'common.remove' | t }}
          </button>
        }
        <button matButton="filled" type="submit">
          {{ (data.removable ? 'common.save' : 'order.line.add') | t }}
        </button>
      </div>
    </form>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .title {
      margin: 8px 0;
      font: var(--mat-sys-title-medium);
    }
    .qty {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .qty-field {
      width: 120px;
    }
    .addons {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .legend {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .actions button {
      min-height: 48px;
    }
  `,
})
export class LineSheet {
  protected readonly data = inject<LineSheetData>(MAT_BOTTOM_SHEET_DATA);
  protected readonly ref = inject<MatBottomSheetRef<LineSheet, LineSheetResult>>(MatBottomSheetRef);
  private readonly lang = inject(LanguageService).lang;

  protected readonly title = lineName(this.data.line);

  private readonly selected = new Set(this.data.line.addons.map((a) => a.addon_id));
  protected readonly form = new FormGroup({
    qty: new FormControl(this.data.line.qty, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(999),
        Validators.pattern(/^\d+$/),
      ],
    }),
    addons: new FormArray(
      this.data.options.map(
        (a) => new FormControl(this.selected.has(a.addon_id), { nonNullable: true }),
      ),
    ),
    note: new FormControl(this.data.line.note ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  protected step(delta: number): void {
    const qty = Math.trunc(Number(this.form.controls.qty.value) || 0) + delta;
    this.form.controls.qty.setValue(Math.min(999, Math.max(1, qty)));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { qty, addons, note } = this.form.getRawValue();
    this.ref.dismiss({
      ...this.data.line,
      qty: Number(qty),
      note: note.trim() || null,
      addons: this.data.options.filter((_, i) => addons[i]),
    });
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
