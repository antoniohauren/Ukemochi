import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { I18nProvider } from "./i18n";
import { theme } from "./theme";

/** Theme + CSS reset + i18n. Wrap each app root with it. */
export function UiProvider({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<I18nProvider>{children}</I18nProvider>
		</ThemeProvider>
	);
}
