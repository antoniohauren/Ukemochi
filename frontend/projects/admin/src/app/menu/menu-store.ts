import { moveItemInArray } from '@angular/cdk/drag-drop';
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
  type Variant,
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
  /** Switches with a request in flight, as `item:<id>` / `variant:<id>`. */
  readonly pending = signal<ReadonlySet<string>>(new Set());
  private loads = 0;

  readonly categories = computed(() => this.menu()?.categories ?? []);
  readonly category = computed(
    () => this.categories().find((c) => c.id === this.categoryId()) ?? null,
  );
  readonly item = computed(
    () => this.category()?.items.find((i) => i.id === this.itemId()) ?? null,
  );

  /** Only the latest call's answer is applied, so overlapping reloads never show an older tree. */
  async load(): Promise<void> {
    const load = ++this.loads;
    try {
      const menu = await firstValueFrom(this.api.menu());
      if (load === this.loads) {
        this.menu.set(menu);
        this.loadError.set(null);
      }
    } catch (e) {
      if (load === this.loads) {
        this.loadError.set(errorKey(e as ApiError));
      }
    }
  }

  saveCategory(id: number | null, v: MenuForm): Promise<ApiError | null> {
    const sort = id === null ? nextSort(this.categories()) : this.sortOf(this.categories(), id);
    const body = { name: v.name, sort, active: v.flag };
    return this.write(
      id === null ? this.api.createCategory(body) : this.api.updateCategory(id, body),
    );
  }

  saveItem(categoryId: number, id: number | null, v: MenuForm): Promise<ApiError | null> {
    const body = { category_id: categoryId, name: v.name, note: v.note || null };
    return this.write(
      id === null
        ? this.api.createItem({ ...body, active: v.flag, price_cents: v.price_cents })
        : this.api.updateItem(id, body),
    );
  }

  saveVariant(itemId: number, id: number | null, v: MenuForm): Promise<ApiError | null> {
    const variants = this.variantsOf(itemId);
    const sort = id === null ? nextSort(variants) : this.sortOf(variants, id);
    const body = { name: v.name, price_cents: v.price_cents, sort };
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
  ): Promise<ApiError | null> {
    const { item_id, category_id } = owner;
    const body = { item_id, category_id, name: v.name, price_cents: v.price_cents, active: v.flag };
    return this.write(id === null ? this.api.createAddon(body) : this.api.updateAddon(id, body));
  }

  /** Resolves false on failure, so the caller can flip the switch back. */
  setItemActive(id: number, active: boolean): Promise<boolean> {
    return this.toggle(`item:${id}`, this.api.setItemActive(id, active));
  }

  setVariantAvailable(id: number, available: boolean): Promise<boolean> {
    return this.toggle(`variant:${id}`, this.api.setVariantAvailable(id, available));
  }

  deleteVariant(id: number): Promise<boolean> {
    return this.act(this.api.deleteVariant(id), 'menu.variant.deleted');
  }

  /** Optimistic: shows the new order at once; reverts, reports and reloads if the API refuses. */
  moveCategory(from: number, to: number): Promise<boolean> {
    const categories = this.categories();
    const ids = moved(categories, from, to);
    if (!ids) {
      return Promise.resolve(true);
    }
    return this.reorder(
      { categories: resorted(categories, ids) },
      this.api.reorderCategories({ ids }),
    );
  }

  moveVariant(itemId: number, from: number, to: number): Promise<boolean> {
    const ids = moved(this.variantsOf(itemId), from, to);
    if (!ids) {
      return Promise.resolve(true);
    }
    const categories = this.categories().map((c) => ({
      ...c,
      items: c.items.map((i) =>
        i.id === itemId ? { ...i, variants: resorted(i.variants, ids) } : i,
      ),
    }));
    return this.reorder({ categories }, this.api.reorderVariants(itemId, { ids }));
  }

  private async reorder(next: Menu, call: Observable<unknown>): Promise<boolean> {
    const previous = this.menu();
    this.menu.set(next);
    try {
      await firstValueFrom(call);
      return true;
    } catch (e) {
      this.menu.set(previous);
      this.notify(errorKey(e as ApiError));
      void this.load();
      return false;
    }
  }

  private variantsOf(itemId: number): readonly Variant[] {
    for (const c of this.categories()) {
      const item = c.items.find((i) => i.id === itemId);
      if (item) {
        return item.variants;
      }
    }
    return [];
  }

  /** Edits keep the stored sort; only reordering changes it. */
  private sortOf(rows: readonly { id: number; sort: number }[], id: number): number {
    return rows.find((r) => r.id === id)?.sort ?? 0;
  }

  /** Returns the error on failure (nothing reloaded), so a dialog can show it and stay open. */
  private async write(
    call: Observable<unknown>,
    done: TranslationKey = 'menu.saved',
  ): Promise<ApiError | null> {
    try {
      await firstValueFrom(call);
    } catch (e) {
      return e as ApiError;
    }
    this.notify(done);
    await this.load();
    return null;
  }

  /** A write outside a dialog: the error goes to a snackbar. */
  private async act(call: Observable<unknown>, done?: TranslationKey): Promise<boolean> {
    const error = await this.write(call, done);
    if (error) {
      this.notify(errorKey(error));
    }
    return error === null;
  }

  private async toggle(key: string, call: Observable<unknown>): Promise<boolean> {
    this.pending.update((keys) => new Set(keys).add(key));
    try {
      return await this.act(call);
    } finally {
      this.pending.update((keys) => {
        const rest = new Set(keys);
        rest.delete(key);
        return rest;
      });
    }
  }

  private notify(key: TranslationKey): void {
    this.snackBar.open(this.language.t(key), undefined, { duration: 3000 });
  }
}

/** New rows go last. */
function nextSort(rows: readonly { sort: number }[]): number {
  return Math.max(-1, ...rows.map((r) => r.sort)) + 1;
}

/** Ids in the order after moving `from` to `to`, or null when nothing moves. */
function moved(rows: readonly { id: number }[], from: number, to: number): number[] | null {
  const ids = rows.map((r) => r.id);
  const target = Math.max(0, Math.min(to, ids.length - 1));
  if (from === target || from < 0 || from >= ids.length) {
    return null;
  }
  moveItemInArray(ids, from, target);
  return ids;
}

/** Rows in `ids` order with `sort` = position, as the API stores them. */
function resorted<T extends { id: number; sort: number }>(rows: readonly T[], ids: number[]): T[] {
  return [...rows]
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    .map((r, sort) => ({ ...r, sort }));
}
