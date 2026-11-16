CREATE TABLE categories (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	sort INTEGER NOT NULL DEFAULT 0,
	active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
	note TEXT
);

CREATE TABLE items (
	id INTEGER PRIMARY KEY,
	category_id INTEGER NOT NULL REFERENCES categories (id),
	name TEXT NOT NULL,
	active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
	note TEXT
);

CREATE INDEX items_category_id ON items (category_id);

CREATE TABLE variants (
	id INTEGER PRIMARY KEY,
	item_id INTEGER NOT NULL REFERENCES items (id),
	name TEXT NOT NULL DEFAULT '',
	price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
	available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
	sort INTEGER NOT NULL DEFAULT 0,
	note TEXT
);

CREATE INDEX variants_item_id ON variants (item_id);

CREATE TABLE addons (
	id INTEGER PRIMARY KEY,
	item_id INTEGER REFERENCES items (id),
	category_id INTEGER REFERENCES categories (id),
	name TEXT NOT NULL,
	price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
	active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
	note TEXT,
	CHECK (item_id IS NULL OR category_id IS NULL)
);
