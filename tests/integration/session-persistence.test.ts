import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PROBE_KEY = 'phase4-persistence-probe';

test('persistent partition survives restart without an app-authored session copy', async () => {
  const launch = () => electron.launch({ args: [resolve('dist/main.cjs')] });
  const firstApp = await launch();
  let userDataPath = '';

  try {
    const firstWindow = await firstApp.firstWindow();
    await expect
      .poll(() => firstWindow.url())
      .toMatch(/https:\/\/www\.facebook\.com\/(login\.php|messages)/);

    userDataPath = await firstApp.evaluate(({ app }) =>
      app.getPath('userData'),
    );
    await firstWindow.evaluate(
      (key) => localStorage.setItem(key, 'present'),
      PROBE_KEY,
    );
  } finally {
    await firstApp.evaluate(({ app }) => app.quit());
    await firstApp.close();
  }

  const secondApp = await launch();
  try {
    const secondWindow = await secondApp.firstWindow();
    await expect
      .poll(() => secondWindow.url())
      .toMatch(/https:\/\/www\.facebook\.com\/(login\.php|messages)/);
    const persistedValue = await secondWindow.evaluate(
      (key) => localStorage.getItem(key),
      PROBE_KEY,
    );
    expect(persistedValue).toBe('present');
  } finally {
    await secondApp.close();
  }

  const rootEntries = readdirSync(userDataPath);
  expect(rootEntries).not.toContain('session.json');
  expect(rootEntries).not.toContain('cookies.json');
  expect(rootEntries).not.toContain('tokens.json');
  expect(rootEntries).not.toContain('auth.json');
  expect(rootEntries).not.toContain('messenger-session.json');
});
