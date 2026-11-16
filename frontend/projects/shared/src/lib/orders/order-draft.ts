import type { Addon, Item, Menu, Variant } from '../api/menu';
import type { LineAddon, LineInput, Order, OrderLine } from '../api/order';

/** A line being edited before it is sent. `id` is the saved line's id, `null` for a new one. */
export interface DraftLine {
  id: number | null;
  variant_id: number;
  item_name: string;
  variant_name: string;
  unit_price_cents: number;
  qty: number;
  note: string | null;
  addons: LineAddon[];
}

/** What a line list shows: a saved `OrderLine` or a draft with its preview total. */
export type LineView = Pick<
  OrderLine,
  'item_name' | 'variant_name' | 'qty' | 'note' | 'addons' | 'total_cents'
>;

export interface MenuEntry {
  category: Menu['categories'][number];
  item: Item & { variants: Variant[]; addons: Addon[] };
  variant: Variant;
}

/** Category, item and variant of a variant id, or null when it is no longer on the menu. */
export function findVariant(menu: Menu, variantId: number): MenuEntry | null {
  for (const category of menu.categories) {
    for (const item of category.items) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (variant) {
        return { category, item, variant };
      }
    }
  }
  return null;
}

/** A fresh line for a picked variant, with the menu's names and price. */
export function newLine({ item, variant }: MenuEntry): DraftLine {
  return {
    id: null,
    variant_id: variant.id,
    item_name: item.name,
    variant_name: variant.name,
    unit_price_cents: variant.price_cents,
    qty: 1,
    note: null,
    addons: [],
  };
}

/** A saved order's lines as drafts: snapshots kept, so an edit sends the same lines back with their ids. */
export function draftLines(order: Order): DraftLine[] {
  return order.lines.map((l) => ({
    id: l.id,
    variant_id: l.variant_id,
    item_name: l.item_name,
    variant_name: l.variant_name,
    unit_price_cents: l.unit_price_cents,
    qty: l.qty,
    note: l.note,
    addons: [...l.addons],
  }));
}

/**
 * Add-ons a line can take: the item's and its category's active ones (what the API accepts),
 * plus those already on the line, which the API keeps even if they were turned off since.
 */
export function addonOptions(entry: MenuEntry | null, selected: readonly LineAddon[]): LineAddon[] {
  const offered = entry
    ? [...entry.item.addons, ...entry.category.addons]
        .filter((a) => a.active)
        .map((a) => ({ addon_id: a.id, name: a.name, price_cents: a.price_cents }))
    : [];
  const ids = new Set(offered.map((a) => a.addon_id));
  return [...offered, ...selected.filter((a) => !ids.has(a.addon_id))];
}

export function lineInput(line: DraftLine): LineInput {
  return {
    ...(line.id !== null && { id: line.id }),
    variant_id: line.variant_id,
    qty: line.qty,
    note: line.note,
    addon_ids: line.addons.map((a) => a.addon_id),
  };
}

/**
 * Preview only, for the draft before it is sent: same rule as the API's line total
 * (qty × (unit + add-ons)). Saved orders show the API's `total_cents`.
 */
export function lineTotal(line: Pick<DraftLine, 'qty' | 'unit_price_cents' | 'addons'>): number {
  return (
    line.qty * (line.unit_price_cents + line.addons.reduce((sum, a) => sum + a.price_cents, 0))
  );
}

/** Preview of the order total: lines + delivery fee. */
export function draftTotal(lines: readonly DraftLine[], deliveryFeeCents: number): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), deliveryFeeCents);
}

export function lineView(line: DraftLine): LineView {
  return { ...line, total_cents: lineTotal(line) };
}

/** What the waitress may pick: active categories and items; every variant, unavailable ones flagged by the UI. */
export function orderableMenu(menu: Menu): Menu {
  return {
    categories: menu.categories
      .filter((c) => c.active)
      .map((c) => ({ ...c, items: c.items.filter((i) => i.active && i.variants.length > 0) }))
      .filter((c) => c.items.length > 0),
  };
}
