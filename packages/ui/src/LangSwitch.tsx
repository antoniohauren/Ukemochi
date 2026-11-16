import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { LOCALES, type Locale } from "@ukemochi/shared";
import { useI18n } from "./i18n";

const LABELS: Record<Locale, string> = { "pt-BR": "PT", en: "EN" };

export function LangSwitch() {
	const { locale, setLocale, t } = useI18n();
	return (
		<ToggleButtonGroup
			exclusive
			value={locale}
			aria-label={t("settings.language")}
			onChange={(_, next: Locale | null) => next && setLocale(next)}
		>
			{LOCALES.map((l) => (
				<ToggleButton key={l} value={l} lang={l}>
					{LABELS[l]}
				</ToggleButton>
			))}
		</ToggleButtonGroup>
	);
}
