import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
} from '@angular/material/dialog';
import { TPipe } from '../i18n/t.pipe';
import type { TranslationKey } from '../i18n/pt-br';

export interface ConfirmData {
  message: TranslationKey;
  confirm: TranslationKey;
}

/** Asks before a destructive action; closes with `true` on confirm. */
@Component({
  selector: 'lib-confirm-dialog',
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-dialog-content>{{ data.message | t }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">{{ 'common.cancel' | t }}</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">
        {{ data.confirm | t }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}
