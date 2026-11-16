import { errorKey } from './error-key';

describe('errorKey', () => {
  it('maps a known code to its error key', () => {
    expect(errorKey({ code: 'auth.invalid_credentials' })).toBe('error.auth.invalid_credentials');
    expect(errorKey({ code: 'network' })).toBe('error.network');
  });

  it('falls back to error.unknown for an unknown code', () => {
    expect(errorKey({ code: 'something.new' })).toBe('error.unknown');
  });
});
