import type { Database } from "bun:sqlite";
import type { MenuRepository } from "../application/ports";
import type { Addon, Category, Item, Variant } from "../domain/menu";

// Rows come back with camelCase aliases; only the 0/1 flags need mapping.
type Flags<T, K extends keyof T> = Omit<T, K> & { [P in K]: number };
type CategoryRow = Flags<Category, "active">;
type ItemRow = Flags<Item, "active">;
type VariantRow = Flags<Variant, "available">;
type AddonRow = Flags<Addon, "active">;

const CATEGORY = "SELECT id, name, sort, active, note FROM categories";
const ITEM =
	"SELECT id, category_id AS categoryId, name, active, note FROM items";
const VARIANT =
	"SELECT id, item_id AS itemId, name, price_cents AS priceCents, available, sort, note FROM variants";
const ADDON =
	"SELECT id, item_id AS itemId, category_id AS categoryId, name, price_cents AS priceCents, active, note FROM addons";

const category = (r: CategoryRow): Category => ({
	...r,
	active: r.active === 1,
});
const item = (r: ItemRow): Item => ({ ...r, active: r.active === 1 });
const variant = (r: VariantRow): Variant => ({
	...r,
	available: r.available === 1,
});
const addon = (r: AddonRow): Addon => ({ ...r, active: r.active === 1 });

function must<T>(row: T | null): T {
	if (row === null) throw new Error("menu write returned no row");
	return row;
}

export function createSqliteMenuRepository(db: Database): MenuRepository {
	const q = {
		allCategories: db.query<CategoryRow, []>(`${CATEGORY} ORDER BY sort, id`),
		allItems: db.query<ItemRow, []>(`${ITEM} ORDER BY name, id`),
		allVariants: db.query<VariantRow, []>(`${VARIANT} ORDER BY sort, id`),
		allAddons: db.query<AddonRow, []>(`${ADDON} ORDER BY name, id`),
		category: db.query<CategoryRow, [number]>(`${CATEGORY} WHERE id = ?`),
		item: db.query<ItemRow, [number]>(`${ITEM} WHERE id = ?`),
		variant: db.query<VariantRow, [number]>(`${VARIANT} WHERE id = ?`),
		itemVariants: db.query<VariantRow, [number]>(
			`${VARIANT} WHERE item_id = ? ORDER BY sort, id`,
		),
		addon: db.query<AddonRow, [number]>(`${ADDON} WHERE id = ?`),
		insertCategory: db.query<
			{ id: number },
			[string, number, number, string | null]
		>(
			"INSERT INTO categories (name, sort, active, note) VALUES (?, ?, ?, ?) RETURNING id",
		),
		saveCategory: db.query<
			never,
			[string, number, number, string | null, number]
		>(
			"UPDATE categories SET name = ?, sort = ?, active = ?, note = ? WHERE id = ?",
		),
		insertItem: db.query<
			{ id: number },
			[number, string, number, string | null]
		>(
			"INSERT INTO items (category_id, name, active, note) VALUES (?, ?, ?, ?) RETURNING id",
		),
		saveItem: db.query<never, [number, string, number, string | null, number]>(
			"UPDATE items SET category_id = ?, name = ?, active = ?, note = ? WHERE id = ?",
		),
		insertVariant: db.query<
			{ id: number },
			[number, string, number, number, number, string | null]
		>(
			"INSERT INTO variants (item_id, name, price_cents, available, sort, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
		),
		saveVariant: db.query<
			never,
			[string, number, number, number, string | null, number]
		>(
			"UPDATE variants SET name = ?, price_cents = ?, available = ?, sort = ?, note = ? WHERE id = ?",
		),
		deleteVariant: db.query<never, [number]>(
			"DELETE FROM variants WHERE id = ?",
		),
		countVariants: db.query<{ n: number }, [number]>(
			"SELECT count(*) AS n FROM variants WHERE item_id = ?",
		),
		insertAddon: db.query<
			{ id: number },
			[number | null, number | null, string, number, number, string | null]
		>(
			"INSERT INTO addons (item_id, category_id, name, price_cents, active, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
		),
		saveAddon: db.query<
			never,
			[
				number | null,
				number | null,
				string,
				number,
				number,
				string | null,
				number,
			]
		>(
			"UPDATE addons SET item_id = ?, category_id = ?, name = ?, price_cents = ?, active = ?, note = ? WHERE id = ?",
		),
	};

	const getCategory = (id: number) => {
		const r = q.category.get(id);
		return r ? category(r) : null;
	};
	const getItem = (id: number) => {
		const r = q.item.get(id);
		return r ? item(r) : null;
	};
	const getVariant = (id: number) => {
		const r = q.variant.get(id);
		return r ? variant(r) : null;
	};
	const getAddon = (id: number) => {
		const r = q.addon.get(id);
		return r ? addon(r) : null;
	};
	const insertVariant = (v: Omit<Variant, "id">) => {
		const r = q.insertVariant.get(
			v.itemId,
			v.name,
			v.priceCents,
			Number(v.available),
			v.sort,
			v.note,
		);
		return must(getVariant(must(r).id));
	};

	return {
		menu() {
			const variants = q.allVariants.all().map(variant);
			const items = q.allItems.all().map((r) => ({
				...item(r),
				variants: variants.filter((v) => v.itemId === r.id),
			}));
			return {
				categories: q.allCategories.all().map((r) => ({
					...category(r),
					items: items.filter((i) => i.categoryId === r.id),
				})),
				addons: q.allAddons.all().map(addon),
			};
		},

		getCategory,
		insertCategory(c) {
			const r = q.insertCategory.get(c.name, c.sort, Number(c.active), c.note);
			return must(getCategory(must(r).id));
		},
		saveCategory(c) {
			q.saveCategory.run(c.name, c.sort, Number(c.active), c.note, c.id);
			return must(getCategory(c.id));
		},

		getItem,
		insertItem: db.transaction(
			(i: Omit<Item, "id">, vs: Omit<Variant, "id" | "itemId">[]) => {
				const id = must(
					q.insertItem.get(i.categoryId, i.name, Number(i.active), i.note),
				).id;
				for (const v of vs) insertVariant({ ...v, itemId: id });
				return {
					...must(getItem(id)),
					variants: q.itemVariants.all(id).map(variant),
				};
			},
		),
		saveItem(i) {
			q.saveItem.run(i.categoryId, i.name, Number(i.active), i.note, i.id);
			return must(getItem(i.id));
		},

		getVariant,
		insertVariant,
		saveVariant(v) {
			q.saveVariant.run(
				v.name,
				v.priceCents,
				Number(v.available),
				v.sort,
				v.note,
				v.id,
			);
			return must(getVariant(v.id));
		},
		deleteVariant: (id) => void q.deleteVariant.run(id),
		countVariants: (itemId) => q.countVariants.get(itemId)?.n ?? 0,

		getAddon,
		insertAddon(a) {
			const r = q.insertAddon.get(
				a.itemId,
				a.categoryId,
				a.name,
				a.priceCents,
				Number(a.active),
				a.note,
			);
			return must(getAddon(must(r).id));
		},
		saveAddon(a) {
			q.saveAddon.run(
				a.itemId,
				a.categoryId,
				a.name,
				a.priceCents,
				Number(a.active),
				a.note,
				a.id,
			);
			return must(getAddon(a.id));
		},
	};
}
