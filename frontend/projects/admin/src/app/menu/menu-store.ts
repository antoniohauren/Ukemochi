import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  type Addon,
  type ApiError,
  errorKey,
  LanguageService,
  type Menu,
  MenuApi,
  type TranslationKey,
} from 'shared';
import type { MenuForm } from './menu-form-dialog';

/** Menu tree, current selection and every menu write. Each write reloads the tree from the API. */
@Injectable()
export class MenuStore {
  private readonly api = inject(MenuApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  readonly menu = signal<Menu | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);
  /** Selected ids; 0 means none (ids start at 1). */
  readonly categoryId = signal(0);
  readonly itemId = signal(0);

  readonly categories = computed(() => this.menu()?.categories ?? []);
  readonly category = computed(
    () => this.categories().find((c) => c.id === this.categoryId()) ?? null,
  );
  readonly item = computed(
    () => this.category()?.items.find((i) => i.id === this.itemId()) ?? null,
  );

  async load(): Promise<void> {
    try {
      this.menu.set(await firstValueFrom(this.api.menu()));
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  saveCategory(id: number | null, v: MenuForm): Promise<TranslationKey | null> {
    const body = { name: v.name, sort: v.sort, active: v.flag };
    return this.write(
      id === null ? this.api.createCategory(body) : this.api.updateCategory(id, body),
    );
  }

  saveItem(categoryId: number, id: number | null, v: MenuForm): Promise<TranslationKey | null> {
    const body = { category_id: categoryId, name: v.name, note: v.note || null };
    return this.write(
      id === null
        ? this.api.createItem({ ...body, active: v.flag, price_cents: v.price_cents })
        : this.api.updateItem(id, body),
    );
  }

  saveVariant(itemId: number, id: number | null, v: MenuForm): Promise<TranslationKey | null> {
    const body = { name: v.name, price_cents: v.price_cents, sort: v.sort };
    return this.write(
      id === null
        ? this.api.createVariant(itemId, { ...body, available: v.flag })
        : this.api.updateVariant(id, body),
    );
  }

  saveAddon(
    owner: Pick<Addon, 'item_id' | 'category_id'>,
    id: number | null,
    v: MenuForm,
  ): Promise<TranslationKey | null> {
    const { item_id, category_id } = owner;
    const body = { item_id, category_id, name: v.name, price_cents: v.price_cents, active: v.flag };
    return this.write(id === null ? this.api.createAddon(body) : this.api.updateAddon(id, body));
  }

  /** Resolves false on failure, so the caller can flip the switch back. */
  setItemActive(id: number, active: boolean): Promise<boolean> {
    return this.act(this.api.setItemActive(id, active));
  }

  setVariantAvailable(id: number, available: boolean): Promise<boolean> {
    return this.act(this.api.setVariantAvailable(id, available));
  }

  deleteVariant(id: number): Promise<boolean> {
    return this.act(this.api.deleteVariant(id), 'menu.variant.deleted');
  }

  /** Returns the error key on failure (nothing reloaded), so a dialog can show it and stay open. */
  private async write(
    call: Observable<unknown>,
    done: TranslationKey = 'menu.saved',
  ): Promise<TranslationKey | null> {
    try {
      await firstValueFrom(call);
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.notify(done);
    await this.load();
    return null;
  }

  /** A write outside a dialog: the error goes to a snackbar. */
  private async act(call: Observable<unknown>, done?: TranslationKey): Promise<boolean> {
    const error = await this.write(call, done);
    if (error) {
      this.notify(error);
    }
    return error === null;
  }

  private notify(key: TranslationKey): void {
    this.snackBar.open(this.language.t(key), undefined, { duration: 3000 });
  }
}
