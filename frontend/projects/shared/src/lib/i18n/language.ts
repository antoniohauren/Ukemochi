import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { en } from './en';
import { type Dictionary, ptBR, type TranslationKey } from './pt-br';

export type Lang = 'pt-BR' | 'en';

export const LANGS: readonly Lang[] = ['pt-BR', 'en'];
const STORAGE_KEY = 'ukemochi.lang';
const dictionaries: Record<Lang, Partial<Dictionary>> = { 'pt-BR': ptBR, en };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly current = signal<Lang>(readStoredLang());
  readonly lang = this.current.asReadonly();
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.document.documentElement.lang = this.current();
  }

  setLang(lang: Lang): void {
    this.current.set(lang);
    this.document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage blocked (private mode, quota): keep the choice in memory only
    }
  }

  /** Falls back to pt-BR, then to the key itself, so a gap never blanks the UI. */
  t(key: TranslationKey): string {
    return dictionaries[this.current()][key] ?? dictionaries['pt-BR'][key] ?? key;
  }
}

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGS.find((lang) => lang === stored) ?? 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}
