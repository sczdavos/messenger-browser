import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { evaluatePermission } from '../../src/main/security/permissions-policy';

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
    'notifications',
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
