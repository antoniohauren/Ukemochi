import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { DomainError, type DomainErrorCode } from "../domain/errors";

const STATUS: Record<DomainErrorCode, ContentfulStatusCode> = {
	not_found: 404,
	invalid: 400,
	conflict: 409,
	unauthorized: 401,
	forbidden: 403,
};

export function createApp() {
	return new Hono()
		.onError((err, c) => {
			if (err instanceof DomainError) {
				return c.json(
					{ error: err.code, message: err.message },
					STATUS[err.code],
				);
			}
			if (err instanceof HTTPException) {
				return c.json({ error: "http", message: err.message }, err.status);
			}
			console.error(err);
			return c.json({ error: "internal" }, 500);
		})
		.notFound((c) => c.json({ error: "not_found" }, 404))
		.get("/health", (c) => c.json({ status: "ok" }));
}

export type AppType = ReturnType<typeof createApp>;
