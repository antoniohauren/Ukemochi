import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());

  it('applies and remembers the chosen theme', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('ukemochi.theme')).toBe('dark');
  });

  it('starts from the stored theme', () => {
    localStorage.setItem('ukemochi.theme', 'light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem('ukemochi.theme', 'pink');
    expect(['light', 'dark']).toContain(TestBed.inject(ThemeService).theme());
  });
});
