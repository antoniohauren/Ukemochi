import {
	addonCreateSchema,
	addonPatchSchema,
	categoryCreateSchema,
	categoryPatchSchema,
	idParamSchema,
	itemCreateSchema,
	itemPatchSchema,
	variantCreateSchema,
	variantPatchSchema,
} from "@ukemochi/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthService } from "../application/auth";
import type { MenuService } from "../application/menu";
import { type AuthEnv, requireAuth, requireRole } from "./auth";
import { validate } from "./validate";

const idParam = validate("param", z.object({ id: idParamSchema }));

/** Any staff reads the menu; only admins change it. */
export function menuRoutes(auth: AuthService, menu: MenuService) {
	const admin = requireRole("admin");
	return new Hono<AuthEnv>()
		.use(requireAuth(auth))
		.get("/", (c) => c.json(menu.menu()))
		.post("/categories", admin, validate("json", categoryCreateSchema), (c) =>
			c.json(menu.createCategory(c.req.valid("json")), 201),
		)
		.patch(
			"/categories/:id",
			admin,
			idParam,
			validate("json", categoryPatchSchema),
			(c) =>
				c.json(
					menu.updateCategory(c.req.valid("param").id, c.req.valid("json")),
				),
		)
		.post("/items", admin, validate("json", itemCreateSchema), (c) =>
			c.json(menu.createItem(c.req.valid("json")), 201),
		)
		.patch(
			"/items/:id",
			admin,
			idParam,
			validate("json", itemPatchSchema),
			(c) =>
				c.json(menu.updateItem(c.req.valid("param").id, c.req.valid("json"))),
		)
		.post(
			"/items/:id/variants",
			admin,
			idParam,
			validate("json", variantCreateSchema),
			(c) =>
				c.json(
					menu.createVariant(c.req.valid("param").id, c.req.valid("json")),
					201,
				),
		)
		.patch(
			"/variants/:id",
			admin,
			idParam,
			validate("json", variantPatchSchema),
			(c) =>
				c.json(
					menu.updateVariant(c.req.valid("param").id, c.req.valid("json")),
				),
		)
		.delete("/variants/:id", admin, idParam, (c) => {
			menu.deleteVariant(c.req.valid("param").id);
			return c.body(null, 204);
		})
		.post("/addons", admin, validate("json", addonCreateSchema), (c) =>
			c.json(menu.createAddon(c.req.valid("json")), 201),
		)
		.patch(
			"/addons/:id",
			admin,
			idParam,
			validate("json", addonPatchSchema),
			(c) =>
				c.json(menu.updateAddon(c.req.valid("param").id, c.req.valid("json"))),
		);
}
