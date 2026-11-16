import type { Role } from "@ukemochi/shared";
import type {
	Addon,
	Category,
	Item,
	ItemWithVariants,
	Menu,
	Variant,
} from "../domain/menu";
import type { User } from "../domain/user";

type New<T> = Omit<T, "id">;

/** `save*` overwrite every field of an existing row by id. */
export type MenuRepository = {
	menu(): Menu;
	getCategory(id: number): Category | null;
	insertCategory(c: New<Category>): Category;
	saveCategory(c: Category): Category;
	getItem(id: number): Item | null;
	/** Inserts the item and its variants in one transaction. */
	insertItem(
		i: New<Item>,
		variants: Omit<Variant, "id" | "itemId">[],
	): ItemWithVariants;
	saveItem(i: Item): Item;
	getVariant(id: number): Variant | null;
	insertVariant(v: New<Variant>): Variant;
	saveVariant(v: Variant): Variant;
	deleteVariant(id: number): void;
	countVariants(itemId: number): number;
	getAddon(id: number): Addon | null;
	insertAddon(a: New<Addon>): Addon;
	saveAddon(a: Addon): Addon;
};

export type Clock = { now(): Date };

export type PinHasher = {
	hash(pin: string): Promise<string>;
	verify(pin: string, hash: string): Promise<boolean>;
};

export type UserRepository = {
	count(): number;
	findById(id: number): User | null;
	/** Case-insensitive name lookup, includes the stored PIN hash. */
	findByName(name: string): (User & { pinHash: string }) | null;
	create(input: { name: string; pinHash: string; role: Role }): User;
};

export type SessionRepository = {
	create(token: string, userId: number, createdAt: Date): void;
	find(token: string): { userId: number; createdAt: Date } | null;
	delete(token: string): void;
};
