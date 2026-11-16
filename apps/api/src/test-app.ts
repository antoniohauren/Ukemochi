import { createAuthService } from "./application/auth";
import { createMenuService } from "./application/menu";
import type { Clock } from "./application/ports";
import { createApp } from "./http/app";
import {
	bunPinHasher,
	createSqliteSessionRepository,
	createSqliteUserRepository,
	systemClock,
} from "./infrastructure/sqlite-auth";
import { createSqliteMenuRepository } from "./infrastructure/sqlite-menu";
import { createTestDb } from "./infrastructure/test-db";

/** App wired to a fresh in-memory DB. */
export function createTestApp(clock: Clock = systemClock) {
	const db = createTestDb();
	const auth = createAuthService({
		users: createSqliteUserRepository(db),
		sessions: createSqliteSessionRepository(db),
		hasher: bunPinHasher,
		clock,
	});
	const menu = createMenuService(createSqliteMenuRepository(db));
	return { app: createApp({ auth, menu }), auth, db };
}
