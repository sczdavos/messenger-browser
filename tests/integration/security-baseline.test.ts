import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';

test('remote renderer realizes the hardened baseline', async () => {
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs')],
  });
  try {
    const window = await electronApp.firstWindow();
    await expect.poll(() => window.url()).toContain('facebook.com');
    const state = await window.evaluate(() => {
      const pageGlobal = globalThis as typeof globalThis & {
        process?: { contextIsolated?: boolean; sandboxed?: boolean };
        require?: unknown;
        module?: unknown;
      };
      return {
        contextIsolated: pageGlobal.process?.contextIsolated,
        sandboxed: pageGlobal.process?.sandboxed,
        requireType: typeof pageGlobal.require,
        moduleType: typeof pageGlobal.module,
        windowProcess: typeof pageGlobal.process,
      };
    });
    expect(state).toEqual({
      contextIsolated: true,
      sandboxed: true,
      requireType: 'undefined',
      moduleType: 'undefined',
      windowProcess: 'undefined',
    });
  } finally {
    await electronApp.close();
  }
});
