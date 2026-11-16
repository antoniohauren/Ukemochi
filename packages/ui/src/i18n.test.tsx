import { expect, test } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import { I18nProvider, useI18n } from "./i18n";
import { LangSwitch } from "./LangSwitch";

function Probe() {
	const { t } = useI18n();
	return <p>{t("auth.login")}</p>;
}

const ui = (
	<I18nProvider>
		<LangSwitch />
		<Probe />
	</I18nProvider>
);

test("defaults to pt-BR", () => {
	render(ui);
	expect(screen.getByText("Entrar")).toBeDefined();
	expect(document.documentElement.lang).toBe("pt-BR");
});

test("switches language and remembers it", () => {
	const { unmount } = render(ui);
	act(() => screen.getByRole("button", { name: "EN" }).click());
	expect(screen.getByText("Log in")).toBeDefined();
	expect(document.documentElement.lang).toBe("en");
	unmount();
	render(ui);
	expect(screen.getByText("Log in")).toBeDefined();
});

test("ignores an unknown saved language", () => {
	localStorage.setItem("ukemochi.locale", "fr");
	render(ui);
	expect(screen.getByText("Entrar")).toBeDefined();
});
