/** `CategoryResource`. */
export interface Category {
  id: number;
  name: string;
  sort: number;
  active: boolean;
}

/** `ItemResource`. `note` is the item's own free-text note. */
export interface Item {
  id: number;
  category_id: number;
  name: string;
  note: string | null;
  active: boolean;
  /** Position in the category; the API puts new items last and keeps it on edits. */
  sort: number;
}

/** `VariantResource`. `name` is `''` for an item's default variant. Price in cents. */
export interface Variant {
  id: number;
  item_id: number;
  name: string;
  price_cents: number;
  available: boolean;
  sort: number;
  /** Printed on tickets in place of "category item · variant"; null prints those. */
  print_name: string | null;
}

/** `AddonResource`. Exactly one of `item_id` / `category_id` is set. */
export interface Addon {
  id: number;
  item_id: number | null;
  category_id: number | null;
  name: string;
  price_cents: number;
  active: boolean;
}

/** `MenuResource`: body of `GET /api/menu`. Soft-deleted variants are left out. */
export interface Menu {
  categories: (Category & {
    addons: Addon[];
    items: (Item & { variants: Variant[]; addons: Addon[] })[];
  })[];
}

/** Body of `POST /api/categories` and `PUT /api/categories/{id}`. */
export type CategoryInput = Omit<Category, 'id'>;

/** Body of `PUT /api/items/{id}`. `active` changes only through `PUT /api/items/{id}/active`. */
export type ItemInput = Omit<Item, 'id' | 'active' | 'sort'>;

/** Body of `POST /api/items`: also the price of the default variant it creates. */
export type NewItemInput = ItemInput & { active: boolean; price_cents: number };

/** Body of `PUT /api/variants/{id}`. `available` changes only through `PUT /api/variants/{id}/available`. */
export type VariantInput = Omit<Variant, 'id' | 'item_id' | 'available'>;

/** Body of `POST /api/items/{id}/variants`. */
export type NewVariantInput = VariantInput & { available: boolean };

/** Body of `POST /api/addons` and `PUT /api/addons/{id}`. */
export type AddonInput = Omit<Addon, 'id'>;

/** Body of `PUT /api/categories/order` and `PUT /api/items/{id}/variants/order`: every id, in the new order. */
export interface ReorderInput {
  ids: number[];
}
