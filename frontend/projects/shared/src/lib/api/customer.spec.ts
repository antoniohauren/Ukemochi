import { formatPhone, validPhone } from './customer';

describe('phone', () => {
  it('formats digits as (88) 8.8888-8888, partial numbers without trailing separators', () => {
    expect(formatPhone('88988887777')).toBe('(88) 9.8888-7777');
    expect(formatPhone('(88) 9.8888-77770')).toBe('(88) 9.8888-7777');
    expect(formatPhone('889888')).toBe('(88) 9.888');
    expect(formatPhone('88')).toBe('(88');
    expect(formatPhone('')).toBe('');
  });

  it('accepts only 11 digits', () => {
    expect(validPhone('(88) 9.8888-7777')).toBe(true);
    expect(validPhone('8898888777')).toBe(false);
  });
});
