import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pinSchema } from "@ukemochi/shared";
import { createAuthService } from "./application/auth";
import { createMenuService } from "./application/menu";
import { createApp } from "./http/app";
import { migrate, openDb } from "./infrastructure/db";
import {
	bunPinHasher,
	createSqliteSessionRepository,
	createSqliteUserRepository,
	systemClock,
} from "./infrastructure/sqlite-auth";
import { createSqliteMenuRepository } from "./infrastructure/sqlite-menu";

const dbPath = Bun.env.DB_PATH ?? "data/ukemochi.sqlite";
const port = Number(Bun.env.PORT ?? 3000);

mkdirSync(dirname(dbPath), { recursive: true });
const db = openDb(dbPath);
const applied = migrate(db);
if (applied.length) console.log(`migrations applied: ${applied.join(", ")}`);

const auth = createAuthService({
	users: createSqliteUserRepository(db),
	sessions: createSqliteSessionRepository(db),
	hasher: bunPinHasher,
	clock: systemClock,
});

const menu = createMenuService(createSqliteMenuRepository(db));

const adminName = Bun.env.ADMIN_NAME ?? "admin";
const adminPin = Bun.env.ADMIN_PIN
	? pinSchema.parse(Bun.env.ADMIN_PIN)
	: String(
			(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 10_000,
		).padStart(4, "0");
if (await auth.seedFirstAdmin(adminName, adminPin)) {
	console.log(`first admin created: name "${adminName}", PIN ${adminPin}`);
}

const server = Bun.serve({ port, fetch: createApp({ auth, menu }).fetch });
console.log(`api listening on ${server.url}`);
