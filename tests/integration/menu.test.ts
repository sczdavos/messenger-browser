import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('application menu matches the native contract', async () => {
  const userData = mkdtempSync(`${tmpdir()}/messenger-menu-`);
  const electronApp = await electron.launch({
    args: [resolve('dist/main.cjs'), `--user-data-dir=${userData}`],
  });
  try {
    await electronApp.firstWindow();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const menu = await electronApp.evaluate(({ Menu }) => {
      const applicationMenu = Menu.getApplicationMenu();
      return applicationMenu?.items.map((item) => ({
        label: item.label,
        roles: item.submenu?.items.map((child) => {
          if (child.type === 'separator') return 'separator';
          if (child.role === 'selectall') return 'selectAll';
          return child.role ?? child.label;
        }),
      }));
    });
    expect(menu?.map((item) => item.label)).toEqual([
      'MessengerBrowser',
      'Edit',
      'View',
      'History',
      'Window',
    ]);
    const edit = menu?.find((item) => item.label === 'Edit');
    expect(edit?.roles).toEqual([
      'undo',
      'redo',
      'separator',
      'cut',
      'copy',
      'paste',
      'selectAll',
    ]);
    const view = menu?.find((item) => item.label === 'View');
    expect(view?.roles).not.toContain('Find');
  } finally {
    await electronApp.close();
  }
});
