import type { TranslationKey } from '../i18n/pt-br';

/** One destination in the bottom tab bar / side nav rail. `icon` is a Material Symbols name. */
export interface NavItem {
  path: string;
  icon: string;
  label: TranslationKey;
}
