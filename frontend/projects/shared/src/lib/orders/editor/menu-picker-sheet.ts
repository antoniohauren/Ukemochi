import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import {
  MatActionList,
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { type Menu } from '../../api/menu';
import { type StockLevel } from '../../api/stock';
import { LanguageService } from '../../i18n/language';
import { TPipe } from '../../i18n/t.pipe';
import { formatMoney } from '../../money/money';

type Category = Menu['categories'][number];
type Item = Category['items'][number];

export interface MenuPickerData {
  menu: Menu;
  /** Low/out tracked variants by id; see stockAlerts(). */
  stock?: Record<number, StockLevel>;
}

/**
 * Category → item → variant picker. Dismisses with the variant id; an item with one variant skips
 * that step. Unavailable and low/out-of-stock variants stay pickable (staff are never blocked), with a hint.
 */
@Component({
  selector: 'lib-menu-picker-sheet',
  imports: [
    MatActionList,
    MatIcon,
    MatIconButton,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      @if (category()) {
        <button mat-icon-button type="button" (click)="back()" [attr.aria-label]="'nav.back' | t">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
        </button>
      }
      <h2 class="title">{{ heading() | t }}</h2>
    </header>
    <mat-action-list>
      @if (item(); as i) {
        @for (v of i.variants; track v.id) {
          <button mat-list-item type="button" (click)="pick(v.id)">
            <span matListItemTitle>{{ v.name || ('menu.variant.default' | t) }}</span>
            @if (!v.available) {
              <span matListItemLine class="hint">{{ 'menu.unavailable' | t }}</span>
            }
            @if (stock(v.id); as s) {
              <span matListItemLine class="hint">{{ s }}</span>
            }
            <span matListItemMeta>{{ money(v.price_cents) }}</span>
          </button>
        }
      } @else if (category(); as c) {
        @for (i of c.items; track i.id) {
          <button mat-list-item type="button" (click)="openItem(i)">
            <span matListItemTitle>{{ i.name }}</span>
            @if (i.variants.length === 1 && stock(i.variants[0].id); as s) {
              <span matListItemLine class="hint">{{ s }}</span>
            }
            @if (samePrice(i)) {
              <span matListItemMeta>{{ money(i.variants[0].price_cents) }}</span>
            }
          </button>
        }
      } @else {
        @for (c of data.menu.categories; track c.id) {
          <button mat-list-item type="button" (click)="category.set(c)">
            <span matListItemTitle>{{ c.name }}</span>
          </button>
        } @empty {
          <p class="empty">{{ 'menu.empty' | t }}</p>
        }
      }
    </mat-action-list>
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .hint {
      color: var(--mat-sys-error);
    }
    .empty {
      padding: 16px;
    }
  `,
})
export class MenuPickerSheet {
  protected readonly data = inject<MenuPickerData>(MAT_BOTTOM_SHEET_DATA);
  private readonly ref = inject<MatBottomSheetRef<MenuPickerSheet, number>>(MatBottomSheetRef);
  private readonly language = inject(LanguageService);
  private readonly lang = this.language.lang;

  protected readonly category = signal<Category | null>(null);
  protected readonly item = signal<Item | null>(null);
  protected readonly heading = computed(() =>
    this.item()
      ? 'order.pick.variant'
      : this.category()
        ? 'order.pick.item'
        : 'order.pick.category',
  );

  protected openItem(item: Item): void {
    if (item.variants.length === 1) {
      this.pick(item.variants[0].id);
    } else {
      this.item.set(item);
    }
  }

  protected samePrice(item: Item): boolean {
    return item.variants.every((v) => v.price_cents === item.variants[0].price_cents);
  }

  protected back(): void {
    if (this.item()) {
      this.item.set(null);
    } else {
      this.category.set(null);
    }
  }

  protected pick(variantId: number): void {
    this.ref.dismiss(variantId);
  }

  /** "Restam 3" / "Esgotado?" for a low or out tracked variant. */
  protected stock(variantId: number): string | null {
    const s = this.data.stock?.[variantId];
    if (!s) {
      return null;
    }
    return s.status === 'out'
      ? this.language.t('stock.out')
      : `${this.language.t('stock.left')} ${s.qty}`;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
