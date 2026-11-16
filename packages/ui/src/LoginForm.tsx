import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { pinSchema } from "@ukemochi/shared";
import { type FormEvent, useState } from "react";
import { useI18n } from "./i18n";

type Props = {
	onSubmit: (name: string, pin: string) => void;
	error?: string | null;
	busy?: boolean;
};

export function LoginForm({ onSubmit, error, busy = false }: Props) {
	const { t } = useI18n();
	const [name, setName] = useState("");
	const [pin, setPin] = useState("");
	const valid = name.trim() !== "" && pinSchema.safeParse(pin).success;

	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (valid && !busy) onSubmit(name.trim(), pin);
	};

	return (
		<Stack component="form" spacing={2} onSubmit={submit} noValidate>
			<TextField
				label={t("auth.name")}
				value={name}
				onChange={(e) => setName(e.target.value)}
				autoComplete="username"
				autoFocus
			/>
			<TextField
				label={t("auth.pin")}
				type="password"
				value={pin}
				onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
				autoComplete="current-password"
				slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 4 } }}
			/>
			{error && <Alert severity="error">{error}</Alert>}
			<Button type="submit" variant="contained" disabled={!valid || busy}>
				{t("auth.login")}
			</Button>
		</Stack>
	);
}
