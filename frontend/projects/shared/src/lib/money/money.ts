import type { Lang } from '../i18n/language';

/** Formats integer cents as BRL for the given UI language. */
export function formatMoney(cents: number, lang: Lang): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Money must be integer cents, got ${cents}`);
  }
  return new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * Parses user input ("12,50", "12.50", "R$ 1.234,56", "1,234.56") into integer cents.
 * Same rules as the API's Money::parse: with one separator kind, 3 digits after it
 * means thousands, 1-2 digits means decimal; with both, the last one is decimal.
 * Returns null when the input is not a valid amount.
 */
export function parseMoney(input: string): number | null {
  // shape: [-][R$][spaces][-]digits-and-separators, at most one "-", no inner whitespace
  const trimmed = input.replace(/^[ \t\n\r\u00a0\u202f]+|[ \t\n\r\u00a0\u202f]+$/g, '');
  const parts = /^(-?)(?:R\$[ \u00a0\u202f]*)?(-?)(\d[\d.,]*)$/.exec(trimmed);
  if (!parts || (parts[1] && parts[2])) {
    return null;
  }
  const negative = Boolean(parts[1] || parts[2]);
  const s = parts[3];

  const [decimal, thousands] = separators(s);
  const int = thousands ? `(?:\\d+|[1-9]\\d{0,2}(?:\\${thousands}\\d{3})+)` : '\\d+';
  const frac = decimal ? `(?:\\${decimal}(\\d{1,2}))` : '()';
  const match = new RegExp(`^(${int})${frac}$`).exec(s);
  if (!match) {
    return null;
  }

  const whole = match[1].replace(/[.,]/g, '');
  const cents = BigInt(whole) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  const value = Number(cents);
  return negative && value !== 0 ? -value : value;
}

function separators(s: string): [decimal: string | null, thousands: string | null] {
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    return lastDot > lastComma ? ['.', ','] : [',', '.'];
  }
  const last = Math.max(lastDot, lastComma);
  if (last < 0) {
    return [null, null];
  }
  const sep = s[last];
  const isThousands = s.split(sep).length > 2 || s.length - last - 1 === 3;
  return isThousands ? [null, sep] : [sep, null];
}
