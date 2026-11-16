import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { type MatDialogConfig, MatDialogClose, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TPipe, type TranslationKey } from 'shared';

/**
 * Form dialogs: full screen on phones, 480px otherwise. Backdrop taps and Esc do not close them,
 * so a stray tap never drops typed input; Cancel / back are the way out.
 */
export function formDialogConfig<D>(data: D, fullScreen: boolean): MatDialogConfig<D> {
  return {
    data,
    disableClose: true,
    ...(fullScreen
      ? { width: '100vw', maxWidth: '100vw', height: '100%', panelClass: 'full-screen-dialog' }
      : { width: '480px' }),
  };
}

/** Dialog title; in a full-screen dialog it becomes a top bar with a back arrow. */
@Component({
  selector: 'app-form-dialog-title',
  imports: [MatDialogClose, MatDialogTitle, MatIcon, MatIconButton, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="close"
      mat-icon-button
      type="button"
      mat-dialog-close
      [attr.aria-label]="'nav.back' | t"
    >
      <mat-icon aria-hidden="true">arrow_back</mat-icon>
    </button>
    <h2 mat-dialog-title class="title">{{ title() | t }}</h2>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
    }
    .title {
      flex: 1;
    }
    .close {
      display: none;
      margin-inline-start: 8px;
    }
    :host-context(.full-screen-dialog) {
      .close {
        display: inline-flex;
      }
      .title {
        padding-inline-start: 8px;
      }
    }
  `,
})
export class FormDialogTitle {
  readonly title = input.required<TranslationKey>();
}
