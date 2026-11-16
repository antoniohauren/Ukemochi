import type { Lang } from '../i18n/language';

/** Thermal printer roll width in mm. */
export type PaperWidth = 58 | 80;

/** `SettingsResource`: body of `GET /api/settings` and of `PUT /api/settings`. Fee in cents. */
export interface Settings {
  restaurant_name: string;
  /** Default UI language. */
  language: Lang;
  paper_width: PaperWidth;
  delivery_fee_enabled: boolean;
  delivery_fee_cents: number;
}
