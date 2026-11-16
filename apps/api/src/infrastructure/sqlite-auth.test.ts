import { describe, expect, test } from "bun:test";
import {
	createSqliteSessionRepository,
	createSqliteUserRepository,
} from "./sqlite-auth";
import { createTestDb } from "./test-db";

describe("sqlite user repository", () => {
	test("creates, counts and finds by id without exposing the hash", () => {
		const users = createSqliteUserRepository(createTestDb());
		expect(users.count()).toBe(0);
		const u = users.create({ name: "Ana", pinHash: "h", role: "waitress" });
		expect(u).toEqual({ id: 1, name: "Ana", role: "waitress", active: true });
		expect(users.count()).toBe(1);
		expect(users.findById(1)).toEqual(u);
		expect(users.findById(2)).toBeNull();
	});

	test("finds by name case-insensitively with the hash", () => {
		const users = createSqliteUserRepository(createTestDb());
		users.create({ name: "Ana", pinHash: "h", role: "admin" });
		expect(users.findByName("ANA")).toMatchObject({ id: 1, pinHash: "h" });
		expect(users.findByName("Bia")).toBeNull();
	});

	test("rejects duplicate names ignoring case", () => {
		const users = createSqliteUserRepository(createTestDb());
		users.create({ name: "Ana", pinHash: "h", role: "admin" });
		expect(() =>
			users.create({ name: "ana", pinHash: "h", role: "admin" }),
		).toThrow();
	});
});

describe("sqlite session repository", () => {
	test("round-trips a session and deletes it", () => {
		const db = createTestDb();
		createSqliteUserRepository(db).create({
			name: "Ana",
			pinHash: "h",
			role: "admin",
		});
		const sessions = createSqliteSessionRepository(db);
		const at = new Date("2026-01-02T03:04:05.000Z");
		sessions.create("tok", 1, at);
		expect(sessions.find("tok")).toEqual({ userId: 1, createdAt: at });
		expect(sessions.find("other")).toBeNull();
		sessions.delete("tok");
		expect(sessions.find("tok")).toBeNull();
	});
});
