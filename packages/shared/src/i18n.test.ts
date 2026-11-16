import { expect, test } from "bun:test";
import { dictionaries, t } from "./i18n";

test("both locales define the same keys", () => {
	expect(Object.keys(dictionaries.en).sort()).toEqual(
		Object.keys(dictionaries["pt-BR"]).sort(),
	);
});

test("translates a key per locale", () => {
	expect(t("en", "common.save")).toBe("Save");
	expect(t("pt-BR", "common.save")).toBe("Salvar");
});

test("interpolates variables", () => {
	expect(t("en", "auth.welcome", { name: "Ana" })).toBe("Welcome, Ana");
	expect(t("pt-BR", "auth.welcome", { name: "Ana" })).toBe("Bem-vinda(o), Ana");
});

test("leaves unknown placeholders untouched", () => {
	expect(t("en", "auth.welcome")).toBe("Welcome, {name}");
});
