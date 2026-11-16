import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, openDb } from "./db";

function tempDir() {
	return mkdtempSync(join(tmpdir(), "ukemochi-"));
}

describe("openDb", () => {
	test("enables WAL and foreign keys on a file database", () => {
		const dir = tempDir();
		try {
			const db = openDb(join(dir, "test.sqlite"));
			expect(db.query("PRAGMA journal_mode").get()).toEqual({
				journal_mode: "wal",
			});
			expect(db.query("PRAGMA foreign_keys").get()).toEqual({
				foreign_keys: 1,
			});
			db.close();
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
});

describe("migrate", () => {
	test("applies .sql files in name order and records them", () => {
		const dir = tempDir();
		try {
			writeFileSync(join(dir, "002_b.sql"), "ALTER TABLE a ADD COLUMN y TEXT;");
			writeFileSync(join(dir, "001_a.sql"), "CREATE TABLE a (x INTEGER);");
			writeFileSync(join(dir, ".gitkeep"), "");
			const db = openDb(":memory:");

			expect(migrate(db, dir)).toEqual(["001_a.sql", "002_b.sql"]);
			db.run("INSERT INTO a (x, y) VALUES (1, 'ok')");
			expect(
				db.query("SELECT name FROM _migrations ORDER BY name").all(),
			).toEqual([{ name: "001_a.sql" }, { name: "002_b.sql" }]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	test("skips migrations already applied", () => {
		const dir = tempDir();
		try {
			writeFileSync(join(dir, "001_a.sql"), "CREATE TABLE a (x INTEGER);");
			const db = openDb(":memory:");
			migrate(db, dir);
			writeFileSync(join(dir, "002_b.sql"), "CREATE TABLE b (x INTEGER);");

			expect(migrate(db, dir)).toEqual(["002_b.sql"]);
			expect(migrate(db, dir)).toEqual([]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	test("throws when an applied migration file was edited", () => {
		const dir = tempDir();
		try {
			writeFileSync(join(dir, "001_a.sql"), "CREATE TABLE a (x INTEGER);");
			const db = openDb(":memory:");
			migrate(db, dir);
			writeFileSync(join(dir, "001_a.sql"), "CREATE TABLE a (z INTEGER);");

			expect(() => migrate(db, dir)).toThrow("001_a.sql");
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	test("rolls back a failing migration and keeps earlier ones", () => {
		const dir = tempDir();
		try {
			writeFileSync(join(dir, "001_a.sql"), "CREATE TABLE a (x INTEGER);");
			writeFileSync(
				join(dir, "002_bad.sql"),
				"CREATE TABLE b (x INTEGER); INSERT INTO nope VALUES (1);",
			);
			const db = openDb(":memory:");

			expect(() => migrate(db, dir)).toThrow();
			const tables = db
				.query("SELECT name FROM sqlite_master WHERE type = 'table'")
				.all();
			expect(tables).toContainEqual({ name: "a" });
			expect(tables).not.toContainEqual({ name: "b" });
			expect(db.query("SELECT name FROM _migrations").all()).toEqual([
				{ name: "001_a.sql" },
			]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
});
