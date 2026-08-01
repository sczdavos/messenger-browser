import { describe, expect, it } from 'vitest';
import { parseSettings } from '../../src/main/session/settings';

describe('settings privacy schema', () => {
  it('accepts only the supported settings fields', () => {
    expect(
      parseSettings({
        schemaVersion: 1,
        windowBounds: { x: 10, y: 20, width: 900, height: 700 },
        zoomLevel: 0.5,
      }),
    ).toEqual({
      schemaVersion: 1,
      windowBounds: { x: 10, y: 20, width: 900, height: 700 },
      zoomLevel: 0.5,
    });
  });

  it.each([
    { schemaVersion: 1, cookies: 'session' },
    { schemaVersion: 1, token: 'secret' },
    { schemaVersion: 1, windowBounds: { x: 0 } },
    { schemaVersion: 1, zoomLevel: Number.NaN },
    { schemaVersion: 2 },
    null,
  ])('rejects invalid or privacy-sensitive data: %j', (value) => {
    expect(parseSettings(value)).toBeNull();
  });
});
