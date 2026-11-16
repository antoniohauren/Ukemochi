import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatListItemLine, MatListItemTitle, MatNavList } from '@angular/material/list';
import { MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSlideToggle, type MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type Addon,
  type Category,
  formatMoney,
  type Item,
  LanguageService,
  TPipe,
  type Variant,
} from 'shared';
import { MenuFormDialog, type MenuFormData } from './menu-form-dialog';
import { MenuStore } from './menu-store';

/**
 * Categories, then the selected category's items, then the selected item's variants and add-ons.
 * Selection lives in the query string so the browser/hardware back button walks back up.
 * Side by side on desktop; one level at a time under 600px.
 */
@Component({
  selector: 'app-menu-page',
  providers: [MenuStore],
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    MatListItem,
    MatListItemLine,
    MatListItemTitle,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    MatNavList,
    MatSlideToggle,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
})
export class MenuPage {
  protected readonly store = inject(MenuStore);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly lang = inject(LanguageService).lang;

  protected readonly depth = computed(() =>
    this.store.item() ? 2 : this.store.category() ? 1 : 0,
  );

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        // Number(null) is 0: nothing selected
        this.store.categoryId.set(Number(params.get('category')));
        this.store.itemId.set(Number(params.get('item')));
      });
    void this.store.load();
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }

  protected editCategory(c: Category | null): void {
    this.open({
      title: c ? 'menu.category.edit' : 'menu.category.new',
      fields: ['name', 'sort', 'flag'],
      flagLabel: 'menu.active',
      value: c
        ? { name: c.name, sort: c.sort, flag: c.active }
        : { sort: this.store.categories().length },
      save: (v) => this.store.saveCategory(c?.id ?? null, v),
    });
  }

  protected editItem(categoryId: number, item: Item | null): void {
    this.open({
      title: item ? 'menu.item.edit' : 'menu.item.new',
      // active changes through the inline switch; price through the variants
      fields: item ? ['name', 'note'] : ['name', 'note', 'price_cents', 'flag'],
      flagLabel: 'menu.active',
      value: item ? { name: item.name, note: item.note ?? '' } : {},
      save: (v) => this.store.saveItem(categoryId, item?.id ?? null, v),
    });
  }

  protected editVariant(itemId: number, variant: Variant | null, count: number): void {
    this.open({
      title: variant ? 'menu.variant.edit' : 'menu.variant.new',
      fields: variant ? ['name', 'price_cents', 'sort'] : ['name', 'price_cents', 'sort', 'flag'],
      nameOptional: true,
      flagLabel: 'menu.available',
      value: variant ?? { sort: count },
      save: (v) => this.store.saveVariant(itemId, variant?.id ?? null, v),
    });
  }

  protected editAddon(owner: Pick<Addon, 'item_id' | 'category_id'>, addon: Addon | null): void {
    this.open({
      title: addon ? 'menu.addon.edit' : 'menu.addon.new',
      fields: ['name', 'price_cents', 'flag'],
      flagLabel: 'menu.active',
      value: addon ? { name: addon.name, price_cents: addon.price_cents, flag: addon.active } : {},
      save: (v) => this.store.saveAddon(owner, addon?.id ?? null, v),
    });
  }

  protected async setItemActive(item: Item, event: MatSlideToggleChange): Promise<void> {
    if (!(await this.store.setItemActive(item.id, event.checked))) {
      event.source.checked = !event.checked;
    }
  }

  protected async setVariantAvailable(
    variant: Variant,
    event: MatSlideToggleChange,
  ): Promise<void> {
    if (!(await this.store.setVariantAvailable(variant.id, event.checked))) {
      event.source.checked = !event.checked;
    }
  }

  private open(data: MenuFormData): void {
    const fullScreen = this.breakpoints.isMatched(Breakpoints.XSmall);
    this.dialog.open(MenuFormDialog, {
      data,
      ...(fullScreen
        ? { width: '100vw', maxWidth: '100vw', height: '100%', panelClass: 'full-screen-dialog' }
        : { width: '480px' }),
    });
  }
}
