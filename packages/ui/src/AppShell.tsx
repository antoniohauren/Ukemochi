import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useI18n } from "./i18n";
import { LangSwitch } from "./LangSwitch";

type Props = { title: string; onLogout: () => void; children: ReactNode };

export function AppShell({ title, onLogout, children }: Props) {
	const { t } = useI18n();
	return (
		<>
			<AppBar position="sticky">
				<Toolbar sx={{ gap: 1 }}>
					<Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
						{title}
					</Typography>
					<Box sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
						<LangSwitch />
					</Box>
					<Button color="inherit" onClick={onLogout}>
						{t("auth.logout")}
					</Button>
				</Toolbar>
			</AppBar>
			<Box component="main" sx={{ p: 2 }}>
				{children}
			</Box>
		</>
	);
}
