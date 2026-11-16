import type {
	AddonCreate,
	AddonPatch,
	CategoryCreate,
	CategoryPatch,
	ItemCreate,
	ItemPatch,
	VariantCreate,
	VariantPatch,
} from "@ukemochi/shared";
import { DomainError } from "../domain/errors";
import type { MenuRepository } from "./ports";

export type MenuService = ReturnType<typeof createMenuService>;

function found<T>(row: T | null, what: string): T {
	if (row === null) throw new DomainError("not_found", `${what} not found`);
	return row;
}

const newVariant = (v: VariantCreate) => ({
	name: v.name,
	priceCents: v.priceCents,
	available: true,
	sort: v.sort ?? 0,
	note: v.note ?? null,
});

export function createMenuService(repo: MenuRepository) {
	const category = (id: number) => found(repo.getCategory(id), "category");
	const item = (id: number) => found(repo.getItem(id), "item");
	const variant = (id: number) => found(repo.getVariant(id), "variant");
	const addon = (id: number) => found(repo.getAddon(id), "addon");

	return {
		menu: () => repo.menu(),

		createCategory: (c: CategoryCreate) =>
			repo.insertCategory({
				name: c.name,
				sort: c.sort ?? 0,
				active: true,
				note: c.note ?? null,
			}),

		updateCategory: (id: number, patch: CategoryPatch) =>
			repo.saveCategory({ ...category(id), ...patch }),

		createItem(i: ItemCreate) {
			category(i.categoryId);
			return repo.insertItem(
				{
					categoryId: i.categoryId,
					name: i.name,
					active: true,
					note: i.note ?? null,
				},
				i.variants.map(newVariant),
			);
		},

		updateItem(id: number, patch: ItemPatch) {
			const current = item(id);
			if (patch.categoryId !== undefined) category(patch.categoryId);
			return repo.saveItem({ ...current, ...patch });
		},

		createVariant(itemId: number, v: VariantCreate) {
			item(itemId);
			return repo.insertVariant({ itemId, ...newVariant(v) });
		},

		updateVariant: (id: number, patch: VariantPatch) =>
			repo.saveVariant({ ...variant(id), ...patch }),

		/** Hard delete. Refuses the last variant: every item keeps one. */
		deleteVariant(id: number) {
			const v = variant(id);
			if (repo.countVariants(v.itemId) <= 1)
				throw new DomainError("conflict", "an item needs at least one variant");
			repo.deleteVariant(id);
		},

		createAddon(a: AddonCreate) {
			if (a.itemId !== undefined) item(a.itemId);
			if (a.categoryId !== undefined) category(a.categoryId);
			return repo.insertAddon({
				itemId: a.itemId ?? null,
				categoryId: a.categoryId ?? null,
				name: a.name,
				priceCents: a.priceCents,
				active: true,
				note: a.note ?? null,
			});
		},

		updateAddon: (id: number, patch: AddonPatch) =>
			repo.saveAddon({ ...addon(id), ...patch }),
	};
}
