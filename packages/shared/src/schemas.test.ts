import { expect, test } from "bun:test";
import {
	centsSchema,
	idParamSchema,
	localeSchema,
	noteSchema,
	pinSchema,
	roleSchema,
} from "./schemas";

test("cents must be a non-negative safe integer", () => {
	expect(centsSchema.parse(0)).toBe(0);
	expect(centsSchema.parse(1250)).toBe(1250);
	for (const bad of [-1, 12.5, Number.MAX_SAFE_INTEGER + 1, "100"]) {
		expect(centsSchema.safeParse(bad).success).toBe(false);
	}
});

test("id coerces route params to positive integers", () => {
	expect(idParamSchema.parse("42")).toBe(42);
	for (const bad of [
		"0",
		"-1",
		"1.5",
		"abc",
		"",
		"0x1f",
		"1e2",
		" 7 ",
		"9007199254740993",
	]) {
		expect(idParamSchema.safeParse(bad).success).toBe(false);
	}
});

test("note is optional, trimmed and length-limited", () => {
	expect(noteSchema.parse(undefined)).toBeUndefined();
	expect(noteSchema.parse("  no wasabi  ")).toBe("no wasabi");
	expect(noteSchema.safeParse("x".repeat(1001)).success).toBe(false);
});

test("pin is exactly 4 digits", () => {
	expect(pinSchema.parse("0123")).toBe("0123");
	for (const bad of ["123", "12345", "12a4", 1234]) {
		expect(pinSchema.safeParse(bad).success).toBe(false);
	}
});

test("role and locale accept only known values", () => {
	expect(roleSchema.parse("kitchen")).toBe("kitchen");
	expect(roleSchema.safeParse("owner").success).toBe(false);
	expect(localeSchema.parse("pt-BR")).toBe("pt-BR");
	expect(localeSchema.safeParse("es").success).toBe(false);
});
