import { expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "./i18n";
import { MoneyInput } from "./MoneyInput";

test("shows the initial value and reports typed money as cents", () => {
	const onChange = mock();
	render(
		<I18nProvider>
			<MoneyInput label="Preço" value={1250} onChange={onChange} />
		</I18nProvider>,
	);
	const input = screen.getByLabelText("Preço") as HTMLInputElement;
	expect(input.value).toBe("R$ 12,50");
	fireEvent.change(input, { target: { value: "1.234,5" } });
	expect(onChange).toHaveBeenLastCalledWith(123450);
	fireEvent.change(input, { target: { value: "abc" } });
	expect(onChange).toHaveBeenLastCalledWith(null);
	expect(input.getAttribute("aria-invalid")).toBe("true");
});
