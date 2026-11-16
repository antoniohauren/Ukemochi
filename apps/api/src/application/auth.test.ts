import { describe, expect, test } from "bun:test";
import type { User } from "../domain/user";
import {
	createAuthService,
	LOCKOUT_MS,
	MAX_FAILED_LOGINS,
	SESSION_TTL_MS,
} from "./auth";
import type { SessionRepository, UserRepository } from "./ports";

function setup() {
	const rows: (User & { pinHash: string })[] = [];
	const users: UserRepository = {
		count: () => rows.length,
		findById: (id) => {
			const r = rows.find((u) => u.id === id);
			if (!r) return null;
			const { pinHash: _, ...u } = r;
			return u;
		},
		findByName: (name) =>
			rows.find((u) => u.name.toLowerCase() === name.toLowerCase()) ?? null,
		create: ({ name, pinHash, role }) => {
			const u = { id: rows.length + 1, name, role, active: true };
			rows.push({ ...u, pinHash });
			return u;
		},
	};
	const tokens = new Map<string, { userId: number; createdAt: Date }>();
	const sessions: SessionRepository = {
		create: (t, userId, createdAt) => void tokens.set(t, { userId, createdAt }),
		find: (t) => tokens.get(t) ?? null,
		delete: (t) => void tokens.delete(t),
	};
	let now = 1_000_000;
	const auth = createAuthService({
		users,
		sessions,
		hasher: {
			hash: async (pin) => `h:${pin}`,
			verify: async (pin, hash) => hash === `h:${pin}`,
		},
		clock: { now: () => new Date(now) },
	});
	return { auth, rows, tokens, advance: (ms: number) => (now += ms) };
}

describe("auth service", () => {
	test("seeds first admin only when there are no users", async () => {
		const { auth } = setup();
		expect(await auth.seedFirstAdmin("Ana", "1234")).toEqual({
			id: 1,
			name: "Ana",
			role: "admin",
			active: true,
		});
		expect(await auth.seedFirstAdmin("Bia", "9999")).toBeNull();
	});

	test("logs in with right PIN, case-insensitive name, without leaking hash", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		const r = await auth.login("ana", "1234");
		expect(r.user).toEqual({ id: 1, name: "Ana", role: "admin", active: true });
		expect(r.token.length).toBeGreaterThanOrEqual(40);
		expect(auth.authenticate(r.token)).toEqual(r.user);
	});

	test("rejects wrong PIN and unknown name", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		await expect(auth.login("Ana", "0000")).rejects.toMatchObject({
			code: "unauthorized",
		});
		await expect(auth.login("Zé", "1234")).rejects.toMatchObject({
			code: "unauthorized",
		});
	});

	test("rejects inactive user at login and on existing sessions", async () => {
		const { auth, rows } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		const { token } = await auth.login("Ana", "1234");
		const row = rows[0];
		if (!row) throw new Error("no row");
		row.active = false;
		expect(auth.authenticate(token)).toBeNull();
		await expect(auth.login("Ana", "1234")).rejects.toMatchObject({
			code: "unauthorized",
		});
	});

	test("logout invalidates the token", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		const { token } = await auth.login("Ana", "1234");
		auth.logout(token);
		expect(auth.authenticate(token)).toBeNull();
	});

	test("locks a name after repeated failures, unlocks after timeout", async () => {
		const { auth, advance } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
			await expect(auth.login("Ana", "0000")).rejects.toMatchObject({
				code: "unauthorized",
			});
		}
		await expect(auth.login("ANA", "1234")).rejects.toMatchObject({
			code: "rate_limited",
		});
		advance(LOCKOUT_MS);
		// Lock expired: one more failure does not re-lock.
		await expect(auth.login("Ana", "0000")).rejects.toMatchObject({
			code: "unauthorized",
		});
		expect((await auth.login("Ana", "1234")).user.name).toBe("Ana");
	});

	test("parallel wrong PINs cannot bypass the lockout", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		const results = await Promise.allSettled(
			Array.from({ length: 20 }, () => auth.login("Ana", "0000")),
		);
		const codes = results.map((r) =>
			r.status === "rejected" ? (r.reason as { code: string }).code : "ok",
		);
		expect(codes.filter((c) => c === "unauthorized")).toHaveLength(
			MAX_FAILED_LOGINS,
		);
		expect(codes.filter((c) => c === "rate_limited")).toHaveLength(
			20 - MAX_FAILED_LOGINS,
		);
	});

	test("flooding random names does not clear an active lock", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
			await auth.login("Ana", "0000").catch(() => {});
		}
		for (let i = 0; i < 1100; i++) {
			await auth.login(`x${i}`, "0000").catch(() => {});
		}
		await expect(auth.login("Ana", "1234")).rejects.toMatchObject({
			code: "rate_limited",
		});
	});

	test("session expires after SESSION_TTL_MS", async () => {
		const { auth, advance } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		const { token } = await auth.login("Ana", "1234");
		advance(SESSION_TTL_MS - 1);
		expect(auth.authenticate(token)).not.toBeNull();
		advance(1);
		expect(auth.authenticate(token)).toBeNull();
	});

	test("success resets the failure count", async () => {
		const { auth } = setup();
		await auth.seedFirstAdmin("Ana", "1234");
		for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) {
			await auth.login("Ana", "0000").catch(() => {});
		}
		await auth.login("Ana", "1234");
		await auth.login("Ana", "0000").catch(() => {});
		expect((await auth.login("Ana", "1234")).user.name).toBe("Ana");
	});
});
