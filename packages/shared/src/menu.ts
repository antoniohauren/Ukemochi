import { z } from "zod";
import { centsSchema } from "./schemas";

const name = z.string().trim().min(1).max(100);
const sort = z.number().int().min(0).max(1_000_000);
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
/** Optional note on input; blank or null clears it. */
const note = z
	.string()
	.trim()
	.max(1000)
	.nullable()
	.transform((v) => v || null)
	.optional();

export const variantCreateSchema = z.object({
	name,
	priceCents: centsSchema,
	sort: sort.optional(),
	note,
});

export const variantPatchSchema = variantCreateSchema.partial().extend({
	available: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
	name,
	sort: sort.optional(),
	note,
});

export const categoryPatchSchema = categoryCreateSchema.partial().extend({
	active: z.boolean().optional(),
});

export const itemCreateSchema = z.object({
	categoryId: id,
	name,
	note,
	/** Name may be empty here only: an item without real variants has one default variant. */
	variants: z
		.array(variantCreateSchema.extend({ name: z.string().trim().max(100) }))
		.min(1)
		.max(50)
		.refine((vs) => vs.length === 1 || vs.every((v) => v.name !== ""), {
			message: "only a single default variant may have an empty name",
		}),
});

export const itemPatchSchema = z.object({
	categoryId: id.optional(),
	name: name.optional(),
	active: z.boolean().optional(),
	note,
});

/** Add-on scope: one item, one category, or global when both are missing. */
export const addonCreateSchema = z
	.object({
		name,
		priceCents: centsSchema,
		itemId: id.optional(),
		categoryId: id.optional(),
		note,
	})
	.refine((a) => a.itemId === undefined || a.categoryId === undefined, {
		message: "addon belongs to an item or a category, not both",
	});

export const addonPatchSchema = z.object({
	name: name.optional(),
	priceCents: centsSchema.optional(),
	active: z.boolean().optional(),
	note,
});

export type VariantCreate = z.infer<typeof variantCreateSchema>;
export type VariantPatch = z.infer<typeof variantPatchSchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;
export type ItemCreate = z.infer<typeof itemCreateSchema>;
export type ItemPatch = z.infer<typeof itemPatchSchema>;
export type AddonCreate = z.infer<typeof addonCreateSchema>;
export type AddonPatch = z.infer<typeof addonPatchSchema>;
