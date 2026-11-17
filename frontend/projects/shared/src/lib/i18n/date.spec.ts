import { formatDateTime, formatTime } from './date';

describe('date formatting', () => {
  it('formats API timestamps per language', () => {
    const iso = '2026-11-16T12:05:00+00:00';
    expect(formatDateTime(iso, 'pt-BR')).toContain('16/11/2026');
    expect(formatDateTime(iso, 'en')).toContain('11/16/26');
    expect(formatTime(iso, 'pt-BR')).toMatch(/\d{2}:05/);
  });
});
