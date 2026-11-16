import { expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "./i18n";
import { LoginForm } from "./LoginForm";

function setup(props: { error?: string; busy?: boolean } = {}) {
	const onSubmit = mock((_name: string, _pin: string) => {});
	render(
		<I18nProvider>
			<LoginForm onSubmit={onSubmit} {...props} />
		</I18nProvider>,
	);
	const name = screen.getByLabelText("Nome") as HTMLInputElement;
	const pin = screen.getByLabelText("PIN") as HTMLInputElement;
	const button = screen.getByRole("button", {
		name: "Entrar",
	}) as HTMLButtonElement;
	return { onSubmit, name, pin, button };
}

test("submits trimmed name and PIN", () => {
	const { onSubmit, name, pin, button } = setup();
	fireEvent.change(name, { target: { value: "  Amanda " } });
	fireEvent.change(pin, { target: { value: "1234" } });
	fireEvent.click(button);
	expect(onSubmit).toHaveBeenCalledWith("Amanda", "1234");
});

test("keeps only 4 digits in the PIN", () => {
	const { pin } = setup();
	fireEvent.change(pin, { target: { value: "1a2b3c45" } });
	expect(pin.value).toBe("1234");
});

test("disables submit until name and full PIN are filled", () => {
	const { name, pin, button } = setup();
	expect(button.disabled).toBe(true);
	fireEvent.change(name, { target: { value: "Amanda" } });
	fireEvent.change(pin, { target: { value: "123" } });
	expect(button.disabled).toBe(true);
	fireEvent.change(pin, { target: { value: "1234" } });
	expect(button.disabled).toBe(false);
});

test("does not submit while busy", () => {
	const { onSubmit, name, pin, button } = setup({ busy: true });
	fireEvent.change(name, { target: { value: "Amanda" } });
	fireEvent.change(pin, { target: { value: "1234" } });
	expect(button.disabled).toBe(true);
	fireEvent.submit(button.closest("form") as HTMLFormElement);
	expect(onSubmit).not.toHaveBeenCalled();
});

test("shows the error", () => {
	setup({ error: "Nome ou PIN incorreto" });
	expect(screen.getByRole("alert").textContent).toContain(
		"Nome ou PIN incorreto",
	);
});
