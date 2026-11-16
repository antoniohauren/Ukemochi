import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { type ZodType, z } from "zod";
import { DomainError } from "../domain/errors";

/** `zValidator` that turns a failed parse into a DomainError("invalid") (400). */
export const validate = <
	T extends ZodType,
	Target extends keyof ValidationTargets,
>(
	target: Target,
	schema: T,
) =>
	zValidator(target, schema, (r) => {
		if (!r.success) throw new DomainError("invalid", z.prettifyError(r.error));
	});
