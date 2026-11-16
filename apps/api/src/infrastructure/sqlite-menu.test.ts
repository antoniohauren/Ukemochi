import { describe, expect, test } from "bun:test";
import { createSqliteMenuRepository } from "./sqlite-menu";
import { createTestDb } from "./test-db";

function setup() {
	const db = createTestDb();
	const repo = createSqliteMenuRepository(db);
	const cat = repo.insertCategory({
		name: "Rolls",
		sort: 1,
		active: true,
		note: null,
	});
	return { db, repo, cat };
}

const v = (name: string, priceCents: number, sort = 0) => ({
	name,
	priceCents,
	available: true,
	sort,
	note: null,
});

describe("sqlite menu repository", () => {
	test("round-trips every entity with booleans and nulls", () => {
		const { repo, cat } = setup();
		expect(repo.getCategory(cat.id)).toEqual(cat);
		const item = repo.insertItem(
			{ categoryId: cat.id, name: "Hot roll", active: true, note: "frito" },
			[v("Inteiro", 3000)],
		);
		expect(item).toMatchObject({
			categoryId: cat.id,
			name: "Hot roll",
			active: true,
			note: "frito",
		});
		expect(item.variants).toEqual([
			{ id: expect.any(Number), itemId: item.id, ...v("Inteiro", 3000) },
		]);
		const [first] = item.variants;
		if (!first) throw new Error("no variant");
		const saved = repo.saveVariant({
			...first,
			available: false,
			note: "acabou",
		});
		expect(repo.getVariant(saved.id)).toEqual(saved);
		expect(saved.available).toBe(false);
		const addon = repo.insertAddon({
			itemId: item.id,
			categoryId: null,
			name: "Cream cheese",
			priceCents: 300,
			active: true,
			note: null,
		});
		expect(repo.saveAddon({ ...addon, active: false })).toEqual({
			...addon,
			active: false,
		});
		expect(repo.saveItem({ ...item, active: false, note: null })).toEqual({
			id: item.id,
			categoryId: cat.id,
			name: "Hot roll",
			active: false,
			note: null,
		});
		expect(repo.getItem(999)).toBeNull();
	});

	test("menu nests items and variants, ordered by sort", () => {
		const { repo, cat } = setup();
		const first = repo.insertCategory({
			name: "Entradas",
			sort: 0,
			active: true,
			note: null,
		});
		const item = repo.insertItem(
			{ categoryId: cat.id, name: "Hot roll", active: true, note: null },
			[v("Meio", 1600, 2), v("Inteiro", 3000, 1)],
		);
		const menu = repo.menu();
		expect(menu.categories.map((c) => c.name)).toEqual(["Entradas", "Rolls"]);
		expect(menu.categories[0]).toEqual({ ...first, items: [] });
		expect(menu.categories[1]?.items[0]?.variants.map((x) => x.name)).toEqual([
			"Inteiro",
			"Meio",
		]);
		expect(repo.countVariants(item.id)).toBe(2);
		repo.deleteVariant(item.variants[0]?.id ?? 0);
		expect(repo.countVariants(item.id)).toBe(1);
	});

	test("item insert rolls back when a variant fails", () => {
		const { db, repo, cat } = setup();
		expect(() =>
			repo.insertItem(
				{ categoryId: cat.id, name: "Bad", active: true, note: null },
				[v("ok", 100), v("negative", -1)],
			),
		).toThrow();
		expect(db.query("SELECT count(*) AS n FROM items").get()).toEqual({ n: 0 });
		expect(db.query("SELECT count(*) AS n FROM variants").get()).toEqual({
			n: 0,
		});
	});

	test("addon cannot belong to an item and a category", () => {
		const { repo, cat } = setup();
		const item = repo.insertItem(
			{ categoryId: cat.id, name: "Hot roll", active: true, note: null },
			[v("", 3000)],
		);
		expect(() =>
			repo.insertAddon({
				itemId: item.id,
				categoryId: cat.id,
				name: "x",
				priceCents: 1,
				active: true,
				note: null,
			}),
		).toThrow();
	});
});
