import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';

test('startup creates one Messenger window', async () => {
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs')],
  });
  try {
    const window = await electronApp.firstWindow();
    await expect
      .poll(() => window.url())
      .toMatch(/https:\/\/www\.facebook\.com\/(login\.php|messages)/);
    expect(electronApp.windows()).toHaveLength(1);
  } finally {
    await electronApp.close();
  }
});
