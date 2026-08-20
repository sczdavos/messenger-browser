import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  dialog: { showMessageBox: vi.fn() },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(),
    askForMediaAccess: vi.fn(),
  },
}));

import { formatBlockedDetail } from '../../src/main/features/dialogs';

describe('blocked navigation detail', () => {
  it('names an opaque-origin URL instead of rendering "nullblank"', () => {
    expect(formatBlockedDetail('about:blank', 'unsafe-scheme')).toBe(
      'about:blank (unsafe-scheme)',
    );
  });

  it('shows origin and path for a normal URL', () => {
    expect(
      formatBlockedDetail('https://example.com/article?ref=1', 'not-allowed'),
    ).toBe('https://example.com/article (not-allowed)');
  });

  it('falls back to the reason for a malformed URL', () => {
    expect(formatBlockedDetail('//www.facebook.com', 'malformed-url')).toBe(
      'malformed-url',
    );
  });

  it('truncates an absurdly long target', () => {
    const detail = formatBlockedDetail(
      `https://example.com/${'a'.repeat(400)}`,
      'not-allowed',
    );
    expect(detail).toContain('…');
    expect(detail.length).toBeLessThan(160);
  });
});
