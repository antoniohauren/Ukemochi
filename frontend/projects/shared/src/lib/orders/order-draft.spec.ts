import type { Menu } from '../api/menu';
import type { Order } from '../api/order';
import {
  addonOptions,
  draftLines,
  draftTotal,
  findVariant,
  lineInput,
  lineTotal,
  newLine,
  orderableMenu,
} from './order-draft';

const MENU: Menu = {
  categories: [
    {
      id: 1,
      name: 'Uramaki',
      sort: 0,
      active: true,
      addons: [
        { id: 20, item_id: null, category_id: 1, name: 'Gergelim', price_cents: 100, active: true },
        { id: 21, item_id: null, category_id: 1, name: 'Off', price_cents: 100, active: false },
      ],
      items: [
        {
          id: 10,
          category_id: 1,
          name: 'Philadelphia',
          note: null,
          active: true,
          sort: 0,
          variants: [
            { id: 100, item_id: 10, name: 'Inteiro', price_cents: 3200, available: true, sort: 0 },
            { id: 101, item_id: 10, name: 'Meio', price_cents: 1700, available: false, sort: 1 },
          ],
          addons: [
            {
              id: 30,
              item_id: 10,
              category_id: null,
              name: 'Cream cheese',
              price_cents: 300,
              active: true,
            },
          ],
        },
        {
          id: 11,
          category_id: 1,
          name: 'Old',
          note: null,
          active: false,
          sort: 1,
          variants: [],
          addons: [],
        },
      ],
    },
    { id: 2, name: 'Hidden', sort: 1, active: false, addons: [], items: [] },
  ],
};

describe('order draft', () => {
  it('finds a variant with its item and category', () => {
    const entry = findVariant(MENU, 101);
    expect(entry?.item.name).toBe('Philadelphia');
    expect(entry?.category.id).toBe(1);
    expect(findVariant(MENU, 999)).toBeNull();
  });

  it('starts a picked line at qty 1 with the menu snapshot', () => {
    expect(newLine(findVariant(MENU, 100)!)).toEqual({
      id: null,
      variant_id: 100,
      category_name: 'Uramaki',
      item_name: 'Philadelphia',
      variant_name: 'Inteiro',
      unit_price_cents: 3200,
      qty: 1,
      note: null,
      addons: [],
    });
  });

  it('offers active item and category add-ons, keeping ones already on the line', () => {
    const kept = { addon_id: 21, name: 'Off', price_cents: 90 };
    expect(addonOptions(findVariant(MENU, 100), [kept]).map((a) => a.addon_id)).toEqual([
      30, 20, 21,
    ]);
    expect(addonOptions(null, [kept])).toEqual([kept]);
  });

  it('computes the preview total as qty × (unit + add-ons) + delivery fee', () => {
    const line = {
      ...newLine(findVariant(MENU, 100)!),
      qty: 3,
      addons: [
        { addon_id: 30, name: 'Cream cheese', price_cents: 300 },
        { addon_id: 20, name: 'Gergelim', price_cents: 100 },
      ],
    };
    expect(lineTotal(line)).toBe(3 * 3600);
    expect(draftTotal([line, newLine(findVariant(MENU, 101)!)], 700)).toBe(10800 + 1700 + 700);
    expect(draftTotal([], 0)).toBe(0);
  });

  it('sends ids only for saved lines', () => {
    const line = {
      ...newLine(findVariant(MENU, 100)!),
      addons: [{ addon_id: 30, name: 'C', price_cents: 300 }],
    };
    expect(lineInput(line)).toEqual({ variant_id: 100, qty: 1, note: null, addon_ids: [30] });
    expect(lineInput({ ...line, id: 5 })).toMatchObject({ id: 5 });
  });

  it('turns saved lines into drafts without their totals', () => {
    const order = {
      lines: [
        {
          id: 5,
          variant_id: 100,
          category_name: 'Uramaki',
          item_name: 'P',
          variant_name: 'I',
          unit_price_cents: 3200,
          qty: 2,
          note: 'sem cebola',
          addons: [],
          total_cents: 6400,
        },
      ],
    } as unknown as Order;
    expect(draftLines(order)).toEqual([
      {
        id: 5,
        variant_id: 100,
        category_name: 'Uramaki',
        item_name: 'P',
        variant_name: 'I',
        unit_price_cents: 3200,
        qty: 2,
        note: 'sem cebola',
        addons: [],
      },
    ]);
  });

  it('hides inactive categories, inactive items and empty categories', () => {
    const menu = orderableMenu(MENU);
    expect(menu.categories.map((c) => c.id)).toEqual([1]);
    expect(menu.categories[0].items.map((i) => i.id)).toEqual([10]);
    expect(menu.categories[0].items[0].variants.length).toBe(2);
  });
});
