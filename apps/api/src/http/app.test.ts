import { describe, expect, test } from "bun:test";
import { HTTPException } from "hono/http-exception";
import { DomainError } from "../domain/errors";
import { createTestDb } from "../infrastructure/test-db";
import { createTestApp } from "../test-app";

describe("app", () => {
	test("GET /health returns ok", async () => {
		const app = createTestApp().app;
		const res = await app.request("/health");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "ok" });
	});

	test("test db has migrations table", () => {
		const db = createTestDb();
		expect(db.query("SELECT count(*) AS n FROM _migrations").get()).toEqual({
			n: expect.any(Number),
		});
	});
});

describe("error handler", () => {
	const cases = [
		["not_found", 404],
		["invalid", 400],
		["conflict", 409],
		["unauthorized", 401],
		["forbidden", 403],
		["rate_limited", 429],
	] as const;

	for (const [code, status] of cases) {
		test(`maps DomainError ${code} to ${status}`, async () => {
			const app = createTestApp().app.get("/boom", () => {
				throw new DomainError(code, "nope");
			});
			const res = await app.request("/boom");
			expect(res.status).toBe(status);
			expect(await res.json()).toEqual({ error: code, message: "nope" });
		});
	}

	test("keeps HTTPException status", async () => {
		const app = createTestApp().app.get("/boom", () => {
			throw new HTTPException(418, { message: "teapot" });
		});
		const res = await app.request("/boom");
		expect(res.status).toBe(418);
		expect(await res.json()).toEqual({ error: "http", message: "teapot" });
	});

	test("hides unknown errors as 500", async () => {
		const app = createTestApp().app.get("/boom", () => {
			throw new Error("secret detail");
		});
		const original = console.error;
		console.error = () => {};
		try {
			const res = await app.request("/boom");
			expect(res.status).toBe(500);
			expect(await res.json()).toEqual({ error: "internal" });
		} finally {
			console.error = original;
		}
	});

	test("unknown route returns 404 json", async () => {
		const res = await createTestApp().app.request("/nope");
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "not_found" });
	});
});
