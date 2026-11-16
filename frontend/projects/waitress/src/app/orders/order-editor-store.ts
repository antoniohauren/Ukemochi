import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import {
  type ApiError,
  type DraftLine,
  draftLines,
  errorKey,
  findVariant,
  LanguageService,
  lineView,
  type Menu,
  MenuApi,
  type MenuEntry,
  type Order,
  orderableMenu,
  OrdersApi,
  SettingsApi,
  type TranslationKey,
} from 'shared';
import { orderBody, type OrderFormValue } from './order-form';

/** Draft lines of a new or edited order, plus what the editor needs from the API (menu, fee default). */
@Injectable()
export class OrderEditorStore {
  private readonly orders = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly settingsApi = inject(SettingsApi);
  private readonly router = inject(Router);
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

  async load(id: number | null): Promise<void> {
    this.editId = id;
    try {
      const [menu, settings, order] = await Promise.all([
        firstValueFrom(this.menuApi.menu()),
        firstValueFrom(this.settingsApi.get()),
        firstValueFrom(id === null ? of(null) : this.orders.get(id)),
      ]);
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
    await this.router.navigateByUrl(`/orders/${saved.id}`);
    return null;
  }
}
