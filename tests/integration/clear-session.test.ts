import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('clearing the Messenger partition removes origin storage', async () => {
  const userData = mkdtempSync(`${tmpdir()}/messenger-clear-`);
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs'), `--user-data-dir=${userData}`],
  });
  try {
    const window = await electronApp.firstWindow();
    await expect.poll(() => window.url()).toContain('facebook.com');
    await window.evaluate(() =>
      localStorage.setItem('clear-session-probe', 'present'),
    );
    await electronApp.evaluate(async ({ session }) => {
      await session.fromPartition('persist:messenger').clearStorageData();
    });
    await window.reload({ waitUntil: 'domcontentloaded' });
    expect(
      await window.evaluate(() => localStorage.getItem('clear-session-probe')),
    ).toBeNull();
  } finally {
    await electronApp.evaluate(({ app }) => app.exit(0));
    await electronApp.close();
  }
});
