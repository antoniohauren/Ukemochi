import { expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "./i18n";
import { LoginScreen } from "./LoginScreen";

test("shows the translated error and re-enables login after a failure", async () => {
	render(
		<I18nProvider>
			<LoginScreen
				title="Ukemochi"
				onLogin={async () => "auth.invalid_credentials"}
			/>
		</I18nProvider>,
	);
	fireEvent.change(screen.getByLabelText("Nome"), {
		target: { value: "Ana" },
	});
	fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "0000" } });
	const button = screen.getByRole("button", {
		name: "Entrar",
	}) as HTMLButtonElement;
	fireEvent.click(button);
	await waitFor(() =>
		expect(screen.getByRole("alert").textContent).toContain(
			"Nome ou PIN incorreto",
		),
	);
	expect(button.disabled).toBe(false);
});
