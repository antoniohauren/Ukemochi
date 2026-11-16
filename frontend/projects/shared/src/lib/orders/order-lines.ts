import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  MatActionList,
  MatList,
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { LanguageService } from '../i18n/language';
import { formatMoney } from '../money/money';
import { lineName, type LineView } from './order-draft';

/** Order lines: "2× Category Item · Variant", add-ons, note and line total. `selectable` makes each row a button. */
@Component({
  selector: 'lib-order-lines',
  imports: [
    MatActionList,
    MatList,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectable()) {
      <mat-action-list>
        @for (line of lines(); track $index) {
          <button mat-list-item type="button" (click)="selectLine.emit($index)">
            <span matListItemTitle>{{ title(line) }}</span>
            @if (line.addons.length) {
              <span matListItemLine>+ {{ addons(line) }}</span>
            }
            @if (line.note) {
              <span matListItemLine class="note">{{ line.note }}</span>
            }
            <span matListItemMeta class="total">{{ money(line.total_cents) }}</span>
          </button>
        }
      </mat-action-list>
    } @else {
      <mat-list>
        @for (line of lines(); track $index) {
          <mat-list-item>
            <span matListItemTitle>{{ title(line) }}</span>
            @if (line.addons.length) {
              <span matListItemLine>+ {{ addons(line) }}</span>
            }
            @if (line.note) {
              <span matListItemLine class="note">{{ line.note }}</span>
            }
            <span matListItemMeta class="total">{{ money(line.total_cents) }}</span>
          </mat-list-item>
        }
      </mat-list>
    }
  `,
  styles: `
    .mat-mdc-list-item {
      height: auto;
      min-height: 56px;
    }
    .note {
      font-style: italic;
    }
    .total {
      align-self: center;
      /* Material's meta styles win over plain font/color: set its tokens instead. */
      --mat-list-list-item-trailing-supporting-text-font: var(--mat-sys-title-medium-font);
      --mat-list-list-item-trailing-supporting-text-size: var(--mat-sys-title-medium-size);
      --mat-list-list-item-trailing-supporting-text-line-height: var(
        --mat-sys-title-medium-line-height
      );
      --mat-list-list-item-trailing-supporting-text-weight: var(--mat-sys-title-medium-weight);
      --mat-list-list-item-trailing-supporting-text-color: var(--mat-sys-on-surface);
    }
  `,
})
export class OrderLines {
  readonly lines = input.required<readonly LineView[]>();
  readonly selectable = input(false, { transform: booleanAttribute });
  /** Index of the tapped line (only when `selectable`). */
  readonly selectLine = output<number>();

  private readonly lang = inject(LanguageService).lang;

  protected title(line: LineView): string {
    return `${line.qty}× ${lineName(line)}`;
  }

  protected addons(line: LineView): string {
    return line.addons.map((a) => a.name).join(', ');
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
