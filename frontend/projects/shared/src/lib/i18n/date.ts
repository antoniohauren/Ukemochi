import type { Lang } from './language';

/** API timestamps (ISO 8601 with offset) as short local date + time. */
export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { timeStyle: 'short' }).format(new Date(iso));
}
