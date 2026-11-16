import { describe, expect, test } from "bun:test";
import type { Addon, Category, Item, Variant } from "../domain/menu";
import { createMenuService } from "./menu";
import type { MenuRepository } from "./ports";

function fakeRepo(): MenuRepository {
	const cats: Category[] = [];
	const items: Item[] = [];
	const vars: Variant[] = [];
	const addons: Addon[] = [];
	let seq = 0;
	const put = <T extends { id: number }>(rows: T[], row: T) => {
		const i = rows.findIndex((r) => r.id === row.id);
		rows[i] = row;
		return row;
	};
	const insertVariant = (v: Omit<Variant, "id">) => {
		const row = { ...v, id: ++seq };
		vars.push(row);
		return row;
	};
	return {
		menu: () => ({
			categories: cats.map((c) => ({
				...c,
				items: items
					.filter((i) => i.categoryId === c.id)
					.map((i) => ({
						...i,
						variants: vars.filter((v) => v.itemId === i.id),
					})),
			})),
			addons,
		}),
		getCategory: (id) => cats.find((r) => r.id === id) ?? null,
		insertCategory: (c) => {
			const row = { ...c, id: ++seq };
			cats.push(row);
			return row;
		},
		saveCategory: (c) => put(cats, c),
		getItem: (id) => items.find((r) => r.id === id) ?? null,
		insertItem: (i, vs) => {
			const row = { ...i, id: ++seq };
			items.push(row);
			return {
				...row,
				variants: vs.map((v) => insertVariant({ ...v, itemId: row.id })),
			};
		},
		saveItem: (i) => put(items, i),
		getVariant: (id) => vars.find((r) => r.id === id) ?? null,
		insertVariant,
		saveVariant: (v) => put(vars, v),
		deleteVariant: (id) =>
			void vars.splice(
				vars.findIndex((v) => v.id === id),
				1,
			),
		countVariants: (itemId) => vars.filter((v) => v.itemId === itemId).length,
		getAddon: (id) => addons.find((r) => r.id === id) ?? null,
		insertAddon: (a) => {
			const row = { ...a, id: ++seq };
			addons.push(row);
			return row;
		},
		saveAddon: (a) => put(addons, a),
	};
}

function setup() {
	const menu = createMenuService(fakeRepo());
	const cat = menu.createCategory({ name: "Rolls" });
	const item = menu.createItem({
		categoryId: cat.id,
		name: "Hot roll",
		variants: [
			{ name: "Inteiro 8un", priceCents: 3000 },
			{ name: "Meio 4un", priceCents: 1600 },
		],
	});
	return { menu, cat, item };
}

describe("menu service", () => {
	test("creates records with defaults: active, available, sort 0, no note", () => {
		const { cat, item } = setup();
		expect(cat).toEqual({
			id: cat.id,
			name: "Rolls",
			sort: 0,
			active: true,
			note: null,
		});
		expect(item.active).toBe(true);
		expect(
			item.variants.map((v) => [v.name, v.priceCents, v.available, v.sort]),
		).toEqual([
			["Inteiro 8un", 3000, true, 0],
			["Meio 4un", 1600, true, 0],
		]);
	});

	test("patch changes only given fields; null note clears it", () => {
		const { menu, item } = setup();
		const v = item.variants[0];
		if (!v) throw new Error("no variant");
		menu.updateVariant(v.id, { note: "promo" });
		expect(menu.updateVariant(v.id, { available: false, note: null })).toEqual({
			...v,
			available: false,
			note: null,
		});
	});

	test("unknown ids are not_found", () => {
		const { menu, cat } = setup();
		expect(() => menu.updateCategory(999, { name: "x" })).toThrow(
			"category not found",
		);
		expect(() =>
			menu.createItem({
				categoryId: 999,
				name: "x",
				variants: [{ name: "", priceCents: 1 }],
			}),
		).toThrow("category not found");
		expect(() => menu.createVariant(999, { name: "x", priceCents: 1 })).toThrow(
			"item not found",
		);
		expect(() => menu.updateItem(999, { name: "x" })).toThrow("item not found");
		expect(() => menu.deleteVariant(999)).toThrow("variant not found");
		expect(() => menu.updateAddon(999, { name: "x" })).toThrow(
			"addon not found",
		);
		expect(() =>
			menu.createAddon({ name: "x", priceCents: 1, itemId: 999 }),
		).toThrow("item not found");
		expect(() =>
			menu.createAddon({ name: "x", priceCents: 1, categoryId: 999 }),
		).toThrow("category not found");
		expect(
			menu.createAddon({ name: "x", priceCents: 1, categoryId: cat.id })
				.categoryId,
		).toBe(cat.id);
	});

	test("moving an item checks the target category", () => {
		const { menu, item } = setup();
		expect(() => menu.updateItem(item.id, { categoryId: 999 })).toThrow(
			"category not found",
		);
		const other = menu.createCategory({ name: "Bebidas" });
		expect(menu.updateItem(item.id, { categoryId: other.id }).categoryId).toBe(
			other.id,
		);
	});

	test("cannot delete the last variant of an item", () => {
		const { menu, item } = setup();
		const [a, b] = item.variants;
		if (!a || !b) throw new Error("no variants");
		menu.deleteVariant(a.id);
		expect(() => menu.deleteVariant(b.id)).toThrow("at least one variant");
		expect(menu.menu().categories[0]?.items[0]?.variants).toEqual([b]);
	});
});
