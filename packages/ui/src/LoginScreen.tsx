import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { MessageKey } from "@ukemochi/shared";
import { useState } from "react";
import { useI18n } from "./i18n";
import { LangSwitch } from "./LangSwitch";
import { LoginForm } from "./LoginForm";

type Props = {
	title: string;
	/** Resolves to an error message key, or null on success. */
	onLogin: (name: string, pin: string) => Promise<MessageKey | null>;
};

export function LoginScreen({ title, onLogin }: Props) {
	const { t } = useI18n();
	const [error, setError] = useState<MessageKey | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async (name: string, pin: string) => {
		setBusy(true);
		const result = await onLogin(name, pin);
		setError(result);
		setBusy(false);
	};

	return (
		<Container maxWidth="xs" sx={{ py: 4 }}>
			<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
				<LangSwitch />
			</Box>
			<Paper sx={{ p: 3 }}>
				<Typography variant="h5" component="h1" gutterBottom>
					{title}
				</Typography>
				<LoginForm onSubmit={submit} busy={busy} error={error && t(error)} />
			</Paper>
		</Container>
	);
}
