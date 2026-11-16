import { z } from "zod";
import { LOCALES } from "./i18n";

export const ROLES = ["admin", "waitress", "kitchen"] as const;
export type Role = (typeof ROLES)[number];

/** Integer cents, never negative. */
export const centsSchema = z
	.number()
	.int()
	.nonnegative()
	.max(Number.MAX_SAFE_INTEGER);

/** Positive integer id from a route param string; only plain digits ("42"). */
export const idParamSchema = z
	.string()
	.regex(/^\d+$/)
	.transform(Number)
	.pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

export const noteSchema = z.string().trim().max(1000).optional();

export const pinSchema = z.string().regex(/^\d{4}$/);

export const roleSchema = z.enum(ROLES);

export const localeSchema = z.enum(LOCALES);
