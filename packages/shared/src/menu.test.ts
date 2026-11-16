import { expect, test } from "bun:test";
import {
	addonCreateSchema,
	itemCreateSchema,
	variantCreateSchema,
	variantPatchSchema,
} from "./menu";

test("item needs at least one variant; default variant may have an empty name", () => {
	expect(
		itemCreateSchema.safeParse({
			categoryId: 1,
			name: "Hot roll",
			variants: [],
		}).success,
	).toBe(false);
	expect(
		itemCreateSchema.parse({
			categoryId: 1,
			name: " Hot roll ",
			variants: [{ name: "", priceCents: 2500 }],
		}),
	).toEqual({
		categoryId: 1,
		name: "Hot roll",
		variants: [{ name: "", priceCents: 2500 }],
	});
});

test("only the default variant at item creation may have an empty name", () => {
	expect(
		variantCreateSchema.safeParse({ name: " ", priceCents: 100 }).success,
	).toBe(false);
	expect(variantPatchSchema.safeParse({ name: "" }).success).toBe(false);
	const item = (names: string[]) =>
		itemCreateSchema.safeParse({
			categoryId: 1,
			name: "Uramaki",
			variants: names.map((name) => ({ name, priceCents: 100 })),
		}).success;
	expect(item(["", "4un"])).toBe(false);
	expect(item(["", ""])).toBe(false);
	expect(item(["8un", "4un"])).toBe(true);
});

test("empty or null note clears to null", () => {
	expect(variantPatchSchema.parse({ note: "  " })).toEqual({ note: null });
	expect(variantPatchSchema.parse({ note: null })).toEqual({ note: null });
	expect(variantPatchSchema.parse({ note: " sem gergelim " })).toEqual({
		note: "sem gergelim",
	});
});

test("price must be integer cents", () => {
	expect(variantPatchSchema.safeParse({ priceCents: 12.5 }).success).toBe(
		false,
	);
	expect(variantPatchSchema.safeParse({ priceCents: -1 }).success).toBe(false);
});

test("addon belongs to an item, a category, or neither, not both", () => {
	const base = { name: "Cream cheese", priceCents: 300 };
	expect(addonCreateSchema.safeParse(base).success).toBe(true);
	expect(addonCreateSchema.safeParse({ ...base, itemId: 1 }).success).toBe(
		true,
	);
	expect(
		addonCreateSchema.safeParse({ ...base, itemId: 1, categoryId: 2 }).success,
	).toBe(false);
});
