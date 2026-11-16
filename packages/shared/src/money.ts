import type { Locale } from "./i18n";

const CURRENCY = "BRL";
const MAX_DIGITS = 15; // keeps cents well inside Number.MAX_SAFE_INTEGER

const separators: Record<Locale, { decimal: string; group: string }> = {
	"pt-BR": { decimal: ",", group: "." },
	en: { decimal: ".", group: "," },
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patterns = Object.fromEntries(
	Object.entries(separators).map(([locale, { decimal, group }]) => {
		const d = escapeRegExp(decimal);
		const g = escapeRegExp(group);
		return [
			locale,
			new RegExp(`^(\\d{1,3}(?:${g}\\d{3})+|\\d+)(?:${d}(\\d{1,2}))?$`),
		];
	}),
) as Record<Locale, RegExp>;

/** Parses user-typed money ("R$ 1.234,56", "12.50") into integer cents. Returns null when invalid. */
export function parseMoney(input: string, locale: Locale): number | null {
	// sign and "R$" only as a prefix, either order; spaces only between them and the number
	const parts = /^(-)?\s*(?:R\$)?\s*(-)?(\S*)$/.exec(input.trim());
	if (!parts || (parts[1] && parts[2])) return null;
	const negative = Boolean(parts[1] || parts[2]);
	const match = patterns[locale].exec(parts[3] ?? "");
	if (!match?.[1]) return null;
	const digits =
		match[1].replaceAll(separators[locale].group, "") +
		(match[2] ?? "").padEnd(2, "0");
	if (digits.length > MAX_DIGITS) return null;
	const cents = Number(digits);
	return negative && cents !== 0 ? -cents : cents;
}

const formatters = new Map<Locale, Intl.NumberFormat>();

/** Formats integer cents as BRL for display. */
export function formatMoney(cents: number, locale: Locale): string {
	if (!Number.isSafeInteger(cents))
		throw new RangeError(`cents must be a safe integer, got ${cents}`);
	let f = formatters.get(locale);
	if (!f) {
		f = new Intl.NumberFormat(locale, {
			style: "currency",
			currency: CURRENCY,
		});
		formatters.set(locale, f);
	}
	return f.format(cents / 100);
}
