import { formatMoney, parseMoney } from './money';

const nbsp = '\u00a0';

describe('formatMoney', () => {
  it('formats cents as BRL in pt-BR', () => {
    expect(formatMoney(123456, 'pt-BR')).toBe(`R$${nbsp}1.234,56`);
    expect(formatMoney(5, 'pt-BR')).toBe(`R$${nbsp}0,05`);
    expect(formatMoney(-325, 'pt-BR')).toBe(`-R$${nbsp}3,25`);
  });

  it('formats cents as BRL in en', () => {
    expect(formatMoney(123456, 'en')).toBe('R$1,234.56');
    expect(formatMoney(0, 'en')).toBe('R$0.00');
    expect(formatMoney(-325, 'en')).toBe('-R$3.25');
  });

  it('rejects non-integer cents', () => {
    expect(() => formatMoney(12.5, 'en')).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, 'en')).toThrow(RangeError);
  });
});

describe('parseMoney', () => {
  it.each([
    ['12,50', 1250],
    ['12.50', 1250],
    ['12,5', 1250],
    ['12', 1200],
    ['0,99', 99],
    ['R$ 1.234,56', 123456],
    ['R$1,234.56', 123456],
    [`R$${nbsp}1.234,56`, 123456],
    ['1.234.567,89', 123456789],
    ['1,234,567.89', 123456789],
    ['1.234', 123400],
    ['1,234', 123400],
    ['  7  ', 700],
    ['-3,25', -325],
    ['-R$ 3,25', -325],
    ['007,10', 710],
    ['0', 0],
    ['R$ -3,25', -325],
    ['\u00a012,50\u202f', 1250],
    ['\t12\n', 1200],
  ])('parses %j as %i cents', (input, cents) => {
    expect(parseMoney(input)).toBe(cents);
  });

  it.each([
    '',
    '   ',
    'R$',
    '-',
    'abc',
    '12a',
    '1e3',
    '--1',
    '12,345,6',
    '1.2.3',
    '12,',
    ',50',
    '1,23,456',
    '12.50,3',
    '0,005',
    '1.234,567',
    '+5',
    '12 50',
    '12R$50',
    '1\t000',
    '12,50 R$',
    '-R$ -3',
    'R$ 1 000',
  ])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  it('never returns negative zero', () => {
    expect(Object.is(parseMoney('-0'), 0)).toBe(true);
    expect(Object.is(parseMoney('-R$ 0,00'), 0)).toBe(true);
  });

  it('rejects amounts beyond safe integer cents', () => {
    expect(parseMoney('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMoney('90071992547409,92')).toBeNull();
  });

  it('round-trips with formatMoney', () => {
    for (const cents of [0, 1, 99, 100000, -123456]) {
      expect(parseMoney(formatMoney(cents, 'pt-BR'))).toBe(cents);
      expect(parseMoney(formatMoney(cents, 'en'))).toBe(cents);
    }
  });
});
