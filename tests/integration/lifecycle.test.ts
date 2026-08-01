import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('closing hides the window and activation reopens the same session', async () => {
  const userData = mkdtempSync(`${tmpdir()}/messenger-lifecycle-`);
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs'), `--user-data-dir=${userData}`],
  });
  try {
    const window = await electronApp.firstWindow();
    const initialUrl = await window.url();
    const initialBounds = await electronApp.evaluate(({ BrowserWindow }) => {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) throw new Error('main window was not created');
      return mainWindow.getBounds();
    });

    await electronApp.evaluate(({ BrowserWindow }) => {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) throw new Error('main window was not created');
      mainWindow.close();
    });
    expect(
      await electronApp.evaluate(({ BrowserWindow }) => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow?.isVisible() ?? false;
      }),
    ).toBe(false);

    await electronApp.evaluate(({ app }) => app.emit('activate'));
    expect(
      await electronApp.evaluate(({ BrowserWindow }) => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow?.isVisible() ?? false;
      }),
    ).toBe(true);
    expect(await window.url()).toBe(initialUrl);
    expect(
      await electronApp.evaluate(({ BrowserWindow }) => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) throw new Error('main window was not reopened');
        return mainWindow.getBounds();
      }),
    ).toEqual(initialBounds);
    expect(electronApp.windows()).toHaveLength(1);
  } finally {
    await electronApp.evaluate(({ app }) => app.exit(0));
    await electronApp.close();
  }
});
