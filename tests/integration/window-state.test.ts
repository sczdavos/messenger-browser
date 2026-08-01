import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('window geometry restores after a full restart', async () => {
  const userData = mkdtempSync(`${tmpdir()}/messenger-window-`);
  const launch = () =>
    electron.launch({
      args: [resolve('dist/main.cjs'), `--user-data-dir=${userData}`],
    });
  const firstApp = await launch();
  let savedBounds: { x: number; y: number; width: number; height: number };
  try {
    const firstWindow = await firstApp.firstWindow();
    await expect.poll(() => firstWindow.url()).toContain('facebook.com');
    savedBounds = await firstApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('main window was not created');
      window.setBounds({ x: 80, y: 70, width: 1000, height: 700 });
      return window.getBounds();
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
    await firstApp.evaluate(({ app }) => app.exit(0));
    await firstApp.close();
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    await firstApp.close();
    throw error;
  }

  const secondApp = await launch();
  try {
    await secondApp.firstWindow();
    const restored = await secondApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('main window was not restored');
      return window.getBounds();
    });
    expect(restored.width).toBe(savedBounds.width);
    expect(restored.height).toBe(savedBounds.height);
  } finally {
    await secondApp.close();
  }
});
