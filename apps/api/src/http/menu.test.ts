import { describe, expect, test } from "bun:test";
import { createTestApp } from "../test-app";

async function setup() {
	const t = createTestApp();
	await t.auth.seedFirstAdmin("Ana", "1234");
	t.db.run(
		"INSERT INTO users (name, pin_hash, role) VALUES ('Bia', ?, 'waitress')",
		[await Bun.password.hash("5678")],
	);
	const admin = (await t.auth.login("Ana", "1234")).token;
	const waitress = (await t.auth.login("Bia", "5678")).token;
	const call = (method: string, path: string, token: string, body?: unknown) =>
		t.app.request(path, {
			method,
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	return { ...t, admin, waitress, call };
}

describe("menu routes", () => {
	test("admin builds a menu, any staff reads it", async () => {
		const { call, admin, waitress } = await setup();
		const cat = await call("POST", "/menu/categories", admin, {
			name: "Bebidas",
		});
		expect(cat.status).toBe(201);
		const { id: categoryId } = (await cat.json()) as { id: number };
		const item = await call("POST", "/menu/items", admin, {
			categoryId,
			name: "Refrigerante",
			variants: [{ name: "Coca Zero", priceCents: 700 }],
		});
		expect(item.status).toBe(201);
		const { id: itemId } = (await item.json()) as { id: number };
		const added = await call("POST", `/menu/items/${itemId}/variants`, admin, {
			name: "Guaraná",
			priceCents: 650,
		});
		expect(added.status).toBe(201);
		const { id: variantId } = (await added.json()) as { id: number };
		const off = await call("PATCH", `/menu/variants/${variantId}`, admin, {
			available: false,
		});
		expect(await off.json()).toMatchObject({
			available: false,
			priceCents: 650,
		});
		expect(
			(
				await call("POST", "/menu/addons", admin, {
					name: "Gelo e limão",
					priceCents: 0,
					itemId,
				})
			).status,
		).toBe(201);

		const res = await call("GET", "/menu", waitress);
		expect(res.status).toBe(200);
		const menu = (await res.json()) as {
			categories: {
				name: string;
				items: { variants: { name: string; available: boolean }[] }[];
			}[];
			addons: { name: string; itemId: number }[];
		};
		expect(menu.categories[0]?.name).toBe("Bebidas");
		expect(
			menu.categories[0]?.items[0]?.variants.map((v) => [v.name, v.available]),
		).toEqual([
			["Coca Zero", true],
			["Guaraná", false],
		]);
		expect(menu.addons).toMatchObject([{ name: "Gelo e limão", itemId }]);
	});

	test("waitress cannot change the menu; no token is 401", async () => {
		const { call, app, waitress } = await setup();
		const res = await call("POST", "/menu/categories", waitress, { name: "x" });
		expect(res.status).toBe(403);
		expect((await app.request("/menu")).status).toBe(401);
	});

	test("bad input is 400, unknown id is 404, last variant delete is 409", async () => {
		const { call, admin } = await setup();
		expect(
			(await call("POST", "/menu/categories", admin, { name: "" })).status,
		).toBe(400);
		expect(
			(await call("PATCH", "/menu/categories/abc", admin, {})).status,
		).toBe(400);
		expect(
			(await call("PATCH", "/menu/variants/1", admin, { priceCents: 1.5 }))
				.status,
		).toBe(400);
		expect(
			(
				await call("POST", "/menu/addons", admin, {
					name: "x",
					priceCents: 1,
					itemId: 1,
					categoryId: 1,
				})
			).status,
		).toBe(400);
		expect(
			(await call("PATCH", "/menu/items/42", admin, { name: "x" })).status,
		).toBe(404);
		expect(
			(
				await call("POST", "/menu/items", admin, {
					categoryId: 42,
					name: "x",
					variants: [{ name: "", priceCents: 1 }],
				})
			).status,
		).toBe(404);

		const { id: categoryId } = (await (
			await call("POST", "/menu/categories", admin, { name: "Rolls" })
		).json()) as { id: number };
		const { variants } = (await (
			await call("POST", "/menu/items", admin, {
				categoryId,
				name: "Hot roll",
				variants: [{ name: "", priceCents: 3000 }],
			})
		).json()) as { variants: { id: number }[] };
		const del = await call(
			"DELETE",
			`/menu/variants/${variants[0]?.id}`,
			admin,
		);
		expect(del.status).toBe(409);
		expect(await del.json()).toMatchObject({ error: "conflict" });
	});
});
