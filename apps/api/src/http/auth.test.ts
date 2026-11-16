import { describe, expect, test } from "bun:test";
import { hashToken } from "../infrastructure/sqlite-auth";
import { createTestApp } from "../test-app";
import { requireAuth, requireRole } from "./auth";

async function setup() {
	const t = createTestApp();
	await t.auth.seedFirstAdmin("Ana", "1234");
	return t;
}

const json = (body: unknown) => ({
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(body),
});
const bearer = (token: string) => ({
	headers: { authorization: `Bearer ${token}` },
});

async function login(app: ReturnType<typeof createTestApp>["app"]) {
	const res = await app.request(
		"/auth/login",
		json({ name: "Ana", pin: "1234" }),
	);
	return (await res.json()) as { token: string };
}

describe("auth routes", () => {
	test("login returns token and user, me returns user", async () => {
		const { app } = await setup();
		const res = await app.request(
			"/auth/login",
			json({ name: " Ana ", pin: "1234" }),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { token: string; user: unknown };
		expect(body.user).toEqual({
			id: 1,
			name: "Ana",
			role: "admin",
			active: true,
		});
		const me = await app.request("/auth/me", bearer(body.token));
		expect(me.status).toBe(200);
		expect(await me.json()).toEqual(body.user);
	});

	test("wrong PIN is 401, malformed body is 400", async () => {
		const { app } = await setup();
		const bad = await app.request(
			"/auth/login",
			json({ name: "Ana", pin: "0000" }),
		);
		expect(bad.status).toBe(401);
		for (const body of [
			{ name: "Ana", pin: "12345" },
			{ name: "", pin: "1234" },
			{},
		]) {
			const res = await app.request("/auth/login", json(body));
			expect(res.status).toBe(400);
			expect(await res.json()).toMatchObject({ error: "invalid" });
		}
	});

	test("me without or with bad token is 401", async () => {
		const { app } = await setup();
		expect((await app.request("/auth/me")).status).toBe(401);
		expect((await app.request("/auth/me", bearer("nope"))).status).toBe(401);
	});

	test("logout invalidates the session", async () => {
		const { app } = await setup();
		const { token } = await login(app);
		const out = await app.request("/auth/logout", {
			method: "POST",
			...bearer(token),
		});
		expect(out.status).toBe(204);
		expect((await app.request("/auth/me", bearer(token))).status).toBe(401);
	});

	test("session row stores the token hash, not the token", async () => {
		const { app, db } = await setup();
		const { token } = await login(app);
		expect(db.query("SELECT token, user_id FROM sessions").all()).toEqual([
			{ token: hashToken(token), user_id: 1 },
		]);
	});
});

describe("requireRole", () => {
	test("allows listed roles, 403 for others", async () => {
		const { app, auth, db } = await setup();
		db.run(
			"INSERT INTO users (name, pin_hash, role) VALUES ('Bia', ?, 'kitchen')",
			[await Bun.password.hash("5678")],
		);
		const guarded = app.get(
			"/admin-only",
			requireAuth(auth),
			requireRole("admin"),
			(c) => c.text("ok"),
		);
		const admin = await login(app);
		expect(
			(await guarded.request("/admin-only", bearer(admin.token))).status,
		).toBe(200);
		const kitchen = (await auth.login("Bia", "5678")).token;
		const res = await guarded.request("/admin-only", bearer(kitchen));
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ error: "forbidden" });
	});
});
