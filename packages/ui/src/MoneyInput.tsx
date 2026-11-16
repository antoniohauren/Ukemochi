import TextField from "@mui/material/TextField";
import { formatMoney, parseMoney } from "@ukemochi/shared";
import { useState } from "react";
import { useI18n } from "./i18n";

type Props = {
	label: string;
	/** Initial value in cents. Later changes from the parent are not shown (remount to reset). */
	value: number | null;
	/** Cents, or null while the text is empty or invalid. */
	onChange: (cents: number | null) => void;
	required?: boolean;
};

/** Money text field: the user types "12,50" or "R$ 12,50", the parent gets integer cents. */
export function MoneyInput({ label, value, onChange, required }: Props) {
	const { locale } = useI18n();
	const [text, setText] = useState(() =>
		value === null ? "" : formatMoney(value, locale),
	);
	const cents = parseMoney(text, locale);
	return (
		<TextField
			label={label}
			value={text}
			required={required}
			error={text.trim() !== "" && (cents === null || cents < 0)}
			onChange={(e) => {
				setText(e.target.value);
				onChange(parseMoney(e.target.value, locale));
			}}
			slotProps={{ htmlInput: { inputMode: "decimal" } }}
		/>
	);
}
