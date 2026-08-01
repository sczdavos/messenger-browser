import { describe, expect, it } from 'vitest';
import {
  EXTERNAL_SCHEMES,
  isExternalScheme,
} from '../../../src/main/security/policy/external-schemes';

describe('external scheme policy', () => {
  it.each(['https:', 'http:', 'mailto:', 'tel:'])(
    'allows %s as an external scheme',
    (scheme) => {
      expect(isExternalScheme(scheme)).toBe(true);
    },
  );

  it.each(['javascript:', 'data:', 'file:', 'blob:', 'about:', 'custom:'])(
    'rejects %s',
    (scheme) => {
      expect(isExternalScheme(scheme)).toBe(false);
    },
  );

  it('is a bounded set', () => {
    expect([...EXTERNAL_SCHEMES]).toEqual([
      'https:',
      'http:',
      'mailto:',
      'tel:',
    ]);
  });
});
