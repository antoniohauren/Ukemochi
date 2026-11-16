export type Category = {
	id: number;
	name: string;
	sort: number;
	active: boolean;
	note: string | null;
};

export type Item = {
	id: number;
	categoryId: number;
	name: string;
	active: boolean;
	note: string | null;
};

/** Sellable unit with its own price. An item without real variants has one with an empty name. */
export type Variant = {
	id: number;
	itemId: number;
	name: string;
	priceCents: number;
	available: boolean;
	sort: number;
	note: string | null;
};

/** Priced extra. Scoped to one item, one category, or global when both ids are null. */
export type Addon = {
	id: number;
	itemId: number | null;
	categoryId: number | null;
	name: string;
	priceCents: number;
	active: boolean;
	note: string | null;
};

export type ItemWithVariants = Item & { variants: Variant[] };

/** Full menu tree, inactive and unavailable records included; clients filter. */
export type Menu = {
	categories: (Category & { items: ItemWithVariants[] })[];
	addons: Addon[];
};
