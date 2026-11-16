import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language';
import type { TranslationKey } from './pt-br';

describe('LanguageService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const create = () => TestBed.inject(LanguageService);

  it('defaults to pt-BR', () => {
    const service = create();
    expect(service.lang()).toBe('pt-BR');
    expect(service.t('common.save')).toBe('Salvar');
  });

  it('switches language and persists the choice', () => {
    create().setLang('en');
    expect(TestBed.inject(LanguageService).t('common.save')).toBe('Save');
    expect(localStorage.getItem('ukemochi.lang')).toBe('en');
  });

  it('sets <html lang> on start and on every switch', () => {
    document.documentElement.lang = 'xx';
    const service = create();
    expect(document.documentElement.lang).toBe('pt-BR');
    service.setLang('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('restores the stored language', () => {
    localStorage.setItem('ukemochi.lang', 'en');
    expect(create().lang()).toBe('en');
  });

  it('ignores an unknown stored language', () => {
    localStorage.setItem('ukemochi.lang', 'fr');
    expect(create().lang()).toBe('pt-BR');
  });

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = create();
    expect(service.lang()).toBe('pt-BR');
    service.setLang('en');
    expect(service.lang()).toBe('en');
  });

  it('falls back to the key when it is missing', () => {
    const service = create();
    service.setLang('en');
    expect(service.t('missing.key' as TranslationKey)).toBe('missing.key');
  });
});
