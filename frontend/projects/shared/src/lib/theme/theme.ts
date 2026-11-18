import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

export const THEMES: readonly Theme[] = ['light', 'dark'];
const STORAGE_KEY = 'ukemochi.theme';

/** Light or dark, remembered on this device; follows the system until the user picks one. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<Theme>(readStoredTheme() ?? systemTheme(this.document));
  readonly theme = this.current.asReadonly();

  constructor() {
    this.document.documentElement.dataset['theme'] = this.current();
  }

  setTheme(theme: Theme): void {
    this.current.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage blocked: keep the choice in memory only
    }
  }
}

function systemTheme(doc: Document): Theme {
  return doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.find((t) => t === stored) ?? null;
  } catch {
    return null;
  }
}
