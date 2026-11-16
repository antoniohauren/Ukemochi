import {
	type Locale,
	localeSchema,
	type MessageKey,
	t as translate,
} from "@ukemochi/shared";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

const STORAGE_KEY = "ukemochi.locale";

type I18n = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

function readLocale(): Locale {
	try {
		const saved = localeSchema.safeParse(localStorage.getItem(STORAGE_KEY));
		if (saved.success) return saved.data;
	} catch {}
	return "pt-BR";
}

/** Holds the UI language for this device (saved in localStorage). */
export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState(readLocale);
	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);
	const value = useMemo<I18n>(
		() => ({
			locale,
			setLocale: (next) => {
				try {
					localStorage.setItem(STORAGE_KEY, next);
				} catch {}
				setLocaleState(next);
			},
			t: (key, vars) => translate(locale, key, vars),
		}),
		[locale],
	);
	return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
	const i18n = useContext(I18nContext);
	if (!i18n) throw new Error("useI18n must be used inside I18nProvider");
	return i18n;
}
