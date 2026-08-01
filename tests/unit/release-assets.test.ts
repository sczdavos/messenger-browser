import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('release assets', () => {
  it('keeps the offline page inert and allowlist-compatible', () => {
    const html = readFileSync('src/renderer-static/error.html', 'utf8');
    expect(html).not.toContain('<script');
    expect(html).toContain('href="https://www.facebook.com/messages"');
  });

  it('contains exactly the three approved entitlements and the provided icon', () => {
    const plist = readFileSync('build/entitlements.mac.plist', 'utf8');
    expect(plist.match(/<key>[^<]+<\/key>/g)).toEqual([
      '<key>com.apple.security.cs.allow-jit</key>',
      '<key>com.apple.security.device.camera</key>',
      '<key>com.apple.security.device.audio-input</key>',
    ]);
    expect(
      existsSync('assets/MessengerBrowser-Icons/MessengerBrowser.icns'),
    ).toBe(true);
  });
});
