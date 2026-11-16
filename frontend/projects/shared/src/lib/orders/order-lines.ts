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
import type { LineView } from './order-draft';

/** Order lines: "2× Item · Variant", add-ons, note and line total. `selectable` makes each row a button. */
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
      color: var(--mat-sys-on-surface);
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
    const name = line.variant_name ? `${line.item_name} · ${line.variant_name}` : line.item_name;
    return `${line.qty}× ${name}`;
  }

  protected addons(line: LineView): string {
    return line.addons.map((a) => a.name).join(', ');
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
