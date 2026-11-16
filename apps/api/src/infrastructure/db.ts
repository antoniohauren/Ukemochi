import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(import.meta.dir, "../../migrations");

export function openDb(path: string): Database {
	const db = new Database(path, { create: true, strict: true });
	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA foreign_keys = ON");
	db.run("PRAGMA busy_timeout = 5000");
	return db;
}

/**
 * Applies pending `*.sql` files in name order, each in its own transaction. Returns applied names.
 * Migration files must not contain BEGIN/COMMIT. Throws if an applied file was edited.
 */
export function migrate(db: Database, dir = MIGRATIONS_DIR): string[] {
	db.run(
		"CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
	);
	const done = new Map(
		db
			.query<{ name: string; checksum: string }, []>(
				"SELECT name, checksum FROM _migrations",
			)
			.all()
			.map((r) => [r.name, r.checksum]),
	);
	const record = db.prepare(
		"INSERT INTO _migrations (name, checksum) VALUES (?, ?)",
	);
	const applied: string[] = [];
	const files = readdirSync(dir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const name of files) {
		const sql = readFileSync(join(dir, name), "utf8");
		const checksum = new Bun.CryptoHasher("sha256").update(sql).digest("hex");
		const prev = done.get(name);
		if (prev !== undefined) {
			if (prev !== checksum)
				throw new Error(`applied migration was edited: ${name}`);
			continue;
		}
		db.transaction(() => {
			db.run(sql);
			record.run(name, checksum);
		})();
		applied.push(name);
	}
	return applied;
}
