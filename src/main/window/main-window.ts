import type { BrowserWindow } from 'electron';
import { isInvalidSessionUrl } from '../features/errors';
import { createRemoteWindow } from '../security/remote-window-factory';
import { loadBounds, saveBounds } from './bounds-store';

export const MESSENGER_URL = 'https://www.facebook.com/messages';

export function createMainWindow(): BrowserWindow {
  const win = createRemoteWindow(MESSENGER_URL);
  win.webContents.on('did-navigate', (_event, url) => {
    if (isInvalidSessionUrl(url)) win.show();
  });
  win.setMinimumSize(800, 600);
  const bounds = loadBounds();
  if (bounds) win.setBounds(bounds);
  const persist = (): void => saveBounds(win.getBounds());
  win.on('resize', persist);
  win.on('move', persist);
  return win;
}
