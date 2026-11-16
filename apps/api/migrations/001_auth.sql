CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL UNIQUE COLLATE NOCASE,
	pin_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('admin', 'waitress', 'kitchen')),
	active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
	note TEXT
);

CREATE TABLE sessions (
	token TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	created_at TEXT NOT NULL
);

CREATE INDEX sessions_user_id ON sessions (user_id);
