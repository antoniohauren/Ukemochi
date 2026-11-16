import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';
import { type Menu, MenuApi } from 'shared';
import type { MenuForm } from './menu-form-dialog';
import { MenuStore } from './menu-store';

const MENU: Menu = {
  categories: [
    {
      id: 1,
      name: 'Pastéis',
      sort: 0,
      active: true,
      addons: [],
      items: [
        {
          id: 10,
          category_id: 1,
          name: 'Carne',
          note: null,
          active: true,
          variants: [
            { id: 100, item_id: 10, name: '', price_cents: 1250, available: true, sort: 0 },
          ],
          addons: [],
        },
      ],
    },
  ],
};

const FORM: MenuForm = { name: 'Queijo', note: '', price_cents: 900, sort: 2, flag: false };

describe('MenuStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: MenuStore;
  let snack: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    const ok = () => vi.fn(() => of({}));
    api = {
      menu: vi.fn(() => of(MENU)),
      createCategory: ok(),
      updateCategory: ok(),
      createItem: ok(),
      updateItem: ok(),
      setItemActive: ok(),
      createVariant: ok(),
      updateVariant: ok(),
      setVariantAvailable: ok(),
      deleteVariant: ok(),
      createAddon: ok(),
      updateAddon: ok(),
    };
    TestBed.configureTestingModule({ providers: [MenuStore, { provide: MenuApi, useValue: api }] });
    store = TestBed.inject(MenuStore);
    snack = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
  });

  const fail = (code: string) => vi.fn(() => throwError(() => ({ code, message: code })));

  it('resolves the selected category and item from their ids', async () => {
    await store.load();
    expect(store.category()).toBeNull();
    store.categoryId.set(1);
    store.itemId.set(10);
    expect(store.category()?.name).toBe('Pastéis');
    expect(store.item()?.name).toBe('Carne');
    store.itemId.set(99);
    expect(store.item()).toBeNull();
  });

  it('keeps a translated load error', async () => {
    api['menu'] = fail('network');
    await store.load();
    expect(store.loadError()).toBe('error.network');
    expect(store.menu()).toBeNull();
  });

  it('creates an item with its default price and active flag, then reloads', async () => {
    expect(await store.saveItem(1, null, FORM)).toBeNull();
    expect(api['createItem']).toHaveBeenCalledWith({
      category_id: 1,
      name: 'Queijo',
      note: null,
      active: false,
      price_cents: 900,
    });
    expect(api['menu']).toHaveBeenCalledTimes(1);
    expect(snack).toHaveBeenCalledWith('Salvo.', undefined, { duration: 3000 });
  });

  it('updates an item without active or price', async () => {
    await store.saveItem(1, 10, { ...FORM, note: 'sem cebola' });
    expect(api['updateItem']).toHaveBeenCalledWith(10, {
      category_id: 1,
      name: 'Queijo',
      note: 'sem cebola',
    });
  });

  it('creates a variant with availability and updates one without it', async () => {
    await store.saveVariant(10, null, FORM);
    expect(api['createVariant']).toHaveBeenCalledWith(10, {
      name: 'Queijo',
      price_cents: 900,
      sort: 2,
      available: false,
    });
    await store.saveVariant(10, 100, FORM);
    expect(api['updateVariant']).toHaveBeenCalledWith(100, {
      name: 'Queijo',
      price_cents: 900,
      sort: 2,
    });
  });

  it('sends only the owner ids with an add-on', async () => {
    const addon = { id: 5, item_id: null, category_id: 1, name: 'x', price_cents: 1, active: true };
    await store.saveAddon(addon, 5, FORM);
    expect(api['updateAddon']).toHaveBeenCalledWith(5, {
      item_id: null,
      category_id: 1,
      name: 'Queijo',
      price_cents: 900,
      active: false,
    });
  });

  it('returns the API error of a failed save without reloading', async () => {
    const error = { code: 'validation', message: 'x', errors: { name: ['too long'] } };
    api['createCategory'] = vi.fn(() => throwError(() => error));
    expect(await store.saveCategory(null, FORM)).toEqual(error);
    expect(api['menu']).not.toHaveBeenCalled();
    expect(snack).not.toHaveBeenCalled();
  });

  it('reports a refused delete of the last variant in a snackbar', async () => {
    api['deleteVariant'] = fail('menu.last_variant');
    expect(await store.deleteVariant(100)).toBe(false);
    expect(snack).toHaveBeenCalledWith('O item precisa de ao menos uma variação.', undefined, {
      duration: 3000,
    });
  });

  it('toggles availability and reports success', async () => {
    expect(await store.setVariantAvailable(100, false)).toBe(true);
    expect(api['setVariantAvailable']).toHaveBeenCalledWith(100, false);
    api['setItemActive'] = fail('forbidden');
    expect(await store.setItemActive(10, false)).toBe(false);
  });

  it('sends name, sort and active for a category', async () => {
    await store.saveCategory(1, FORM);
    expect(api['updateCategory']).toHaveBeenCalledWith(1, {
      name: 'Queijo',
      sort: 2,
      active: false,
    });
  });

  it('keeps the latest menu when an older reload answers last', async () => {
    const first = new Subject<Menu>();
    const second = new Subject<Menu>();
    api['menu'] = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const loads = [store.load(), store.load()];
    second.next({ categories: [] });
    second.complete();
    first.next(MENU);
    first.complete();
    await Promise.all(loads);
    expect(store.menu()).toEqual({ categories: [] });
  });

  it('marks a switch pending while its request runs', async () => {
    const reply = new Subject<unknown>();
    api['setVariantAvailable'] = vi.fn(() => reply);
    const done = store.setVariantAvailable(100, false);
    expect(store.pending().has('variant:100')).toBe(true);
    expect(store.pending().has('item:100')).toBe(false);
    reply.next({});
    reply.complete();
    await done;
    expect(store.pending().size).toBe(0);
  });
});
