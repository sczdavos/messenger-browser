import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { evaluatePermission } from '../../src/main/security/permissions-policy';
import { decide } from '../../src/main/security/policy';

test('remote renderer realizes the hardened baseline', async () => {
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs')],
  });
  try {
    const window = await electronApp.firstWindow();
    await expect.poll(() => window.url()).toContain('facebook.com');
    const state = await window.evaluate(() => {
      const pageGlobal = globalThis as typeof globalThis & {
        process?: unknown;
        require?: unknown;
        module?: unknown;
      };
      return {
        processType: typeof pageGlobal.process,
        requireType: typeof pageGlobal.require,
        moduleType: typeof pageGlobal.module,
        windowProcess: typeof pageGlobal.process,
      };
    });
    expect(state).toEqual({
      processType: 'undefined',
      requireType: 'undefined',
      moduleType: 'undefined',
      windowProcess: 'undefined',
    });
  } finally {
    await electronApp.close();
  }
});

test('permission policy denies unapproved capabilities', () => {
  const permissions = [
    'clipboard-read',
    'geolocation',
    'fullscreen',
    'hid',
    'idle-detection',
    'mediaKeySystem',
    'midi',
    'midiSysex',
    'openExternal',
    'pointerLock',
    'serial',
    'storage-access',
    'usb',
    'fileSystem',
    'future-permission-2027',
  ];
  for (const permission of permissions) {
    expect(
      evaluatePermission({
        permission,
        requestingOrigin: 'https://www.facebook.com',
      }).granted,
    ).toBe(false);
  }
});

test('navigation policy keeps remote requests bounded', () => {
  expect(decide('https://www.facebook.com/messages').action).toBe(
    'allow-in-app',
  );
  expect(decide('https://static.xx.fbcdn.net/assets/app.js').action).toBe(
    'open-external',
  );
  expect(decide('https://www.facebook.com/home').action).toBe('open-external');
  expect(decide('https://evil.example/collect').action).toBe('open-external');
});
