import { zValidator } from "@hono/zod-validator";
import { pinSchema, type Role } from "@ukemochi/shared";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { AuthService } from "../application/auth";
import { DomainError } from "../domain/errors";
import type { User } from "../domain/user";

export type AuthEnv = { Variables: { user: User; token: string } };

/** Reads `Authorization: Bearer <token>` and sets `c.var.user`; 401 otherwise. */
export const requireAuth = (auth: AuthService) =>
	createMiddleware<AuthEnv>(async (c, next) => {
		const token = c.req.header("authorization")?.match(/^Bearer (\S+)$/)?.[1];
		const user = token ? auth.authenticate(token) : null;
		if (!token || !user)
			throw new DomainError("unauthorized", "login required");
		c.set("user", user);
		c.set("token", token);
		await next();
	});

/** Use after `requireAuth`. 403 unless the user has one of `roles`. */
export const requireRole = (...roles: Role[]) =>
	createMiddleware<AuthEnv>(async (c, next) => {
		if (!roles.includes(c.var.user.role))
			throw new DomainError("forbidden", "role not allowed");
		await next();
	});

const loginSchema = z.object({
	name: z.string().trim().min(1).max(100),
	pin: pinSchema,
});

export function authRoutes(auth: AuthService) {
	return new Hono<AuthEnv>()
		.post(
			"/login",
			zValidator("json", loginSchema, (r) => {
				if (!r.success)
					throw new DomainError("invalid", "name and 4-digit PIN required");
			}),
			async (c) => {
				const { name, pin } = c.req.valid("json");
				return c.json(await auth.login(name, pin));
			},
		)
		.post("/logout", requireAuth(auth), (c) => {
			auth.logout(c.var.token);
			return c.body(null, 204);
		})
		.get("/me", requireAuth(auth), (c) => c.json(c.var.user));
}
