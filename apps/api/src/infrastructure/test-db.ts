import type { Database } from "bun:sqlite";
import { migrate, openDb } from "./db";

/** Fresh in-memory database with all migrations applied. */
export function createTestDb(): Database {
	const db = openDb(":memory:");
	migrate(db);
	return db;
}
