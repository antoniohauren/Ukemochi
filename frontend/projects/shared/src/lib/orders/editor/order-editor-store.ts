import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { type ApiError } from '../../api/api-client';
import { type Menu } from '../../api/menu';
import { MenuApi } from '../../api/menu-api';
import { type Order } from '../../api/order';
import { OrdersApi } from '../../api/orders-api';
import { SettingsApi } from '../../api/settings-api';
import { stockAlerts, type StockLevel } from '../../api/stock';
import { StockApi } from '../../api/stock-api';
import { errorKey } from '../../i18n/error-key';
import { LanguageService } from '../../i18n/language';
import { type TranslationKey } from '../../i18n/pt-br';
import {
  type DraftLine,
  draftLines,
  findVariant,
  lineView,
  type MenuEntry,
  orderableMenu,
} from '../../orders/order-draft';
import { orderBody, type OrderFormValue } from './order-form';

/** Draft lines of a new or edited order, plus what the editor needs from the API (menu, fee default). */
@Injectable()
export class OrderEditorStore {
  private readonly orders = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly settingsApi = inject(SettingsApi);
  private readonly stockApi = inject(StockApi);
  private readonly router = inject(Router);
  /** Route data `afterSave` sends the app elsewhere after saving (admin: the list); default the order page. */
  private readonly afterSave = inject(ActivatedRoute, { optional: true })?.snapshot.data?.[
    'afterSave'
  ] as string | undefined;
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  private editId: number | null = null;

  /** Whole menu: saved lines may point at items hidden since. */
  readonly menu = signal<Menu | null>(null);
  /** What the pickers offer. */
  readonly orderable = computed(() => {
    const menu = this.menu();
    return menu && orderableMenu(menu);
  });
  /** The order being edited, `null` for a new one. */
  readonly order = signal<Order | null>(null);
  /** Settings' delivery fee when it is on, else 0. */
  readonly defaultFeeCents = signal(0);
  private readonly feeEnabled = signal(false);
  /** Fee field shows when settings charge one, or a saved order already has one. */
  readonly showFee = computed(
    () => this.feeEnabled() || (this.order()?.delivery_fee_cents ?? 0) > 0,
  );
  readonly lines = signal<DraftLine[]>([]);
  readonly views = computed(() => this.lines().map(lineView));
  readonly loadError = signal<TranslationKey | null>(null);
  /** Low/out tracked variants for the picker badges; empty when stock fails to load (never blocks). */
  readonly stock = signal<Record<number, StockLevel>>({});

  async load(id: number | null): Promise<void> {
    this.editId = id;
    try {
      const [menu, settings, order, stock] = await Promise.all([
        firstValueFrom(this.menuApi.menu()),
        firstValueFrom(this.settingsApi.get()),
        firstValueFrom(id === null ? of(null) : this.orders.get(id)),
        firstValueFrom(this.stockApi.levels().pipe(catchError(() => of([])))),
      ]);
      this.stock.set(stockAlerts(stock));
      this.feeEnabled.set(settings.delivery_fee_enabled);
      this.defaultFeeCents.set(settings.delivery_fee_enabled ? settings.delivery_fee_cents : 0);
      if (order) {
        this.order.set(order);
        this.lines.set(draftLines(order));
      }
      this.menu.set(menu);
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  entry(variantId: number): MenuEntry | null {
    const menu = this.menu();
    return menu && findVariant(menu, variantId);
  }

  add(line: DraftLine): void {
    this.lines.update((lines) => [...lines, line]);
  }

  replace(index: number, line: DraftLine): void {
    this.lines.update((lines) => lines.map((l, i) => (i === index ? line : l)));
  }

  remove(index: number): void {
    this.lines.update((lines) => lines.filter((_, i) => i !== index));
  }

  /** Sends the order and opens it; returns the error key on failure so the draft stays. */
  async submit(value: OrderFormValue): Promise<TranslationKey | null> {
    if (this.lines().length === 0) {
      return 'order.no_lines';
    }
    const body = orderBody(value, this.lines());
    let saved: Order;
    try {
      saved = await firstValueFrom(
        this.editId === null ? this.orders.create(body) : this.orders.update(this.editId, body),
      );
    } catch (e) {
      return errorKey(e as ApiError);
    }
    const done = this.editId === null ? 'order.sent' : 'order.saved';
    this.snackBar.open(this.language.t(done), undefined, { duration: 3000 });
    await this.router.navigateByUrl(this.afterSave ?? `/orders/${saved.id}`);
    return null;
  }
}
