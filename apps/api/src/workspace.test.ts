import { expect, test } from "bun:test";

test("resolves workspace packages by package name", async () => {
	expect(await import("@ukemochi/shared")).toBeDefined();
});
