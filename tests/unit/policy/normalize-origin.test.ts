import { describe, expect, it } from 'vitest';
import { normalizeOrigin } from '../../../src/main/security/policy/normalize-origin';

describe('normalizeOrigin', () => {
  it.each([
    '',
    'null',
    'not a url',
    'http://www.facebook.com',
    'file:///tmp/a',
  ])('denies %s', (raw) => {
    expect(normalizeOrigin(raw)).toBeNull();
  });

  it('returns the exact https origin', () => {
    expect(normalizeOrigin('https://www.facebook.com/messages/')).toBe(
      'https://www.facebook.com',
    );
    expect(normalizeOrigin('https://www.facebook.com:443/messages')).toBe(
      'https://www.facebook.com',
    );
    expect(normalizeOrigin('https://www.facebook.com:8443/messages')).toBe(
      'https://www.facebook.com:8443',
    );
  });
});
