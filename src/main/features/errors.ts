import { app, type BrowserWindow } from 'electron';
import { join } from 'node:path';
import { showBlockedNavigation } from './dialogs';

const MESSENGER_URL = 'https://www.facebook.com/messages';

export function isInvalidSessionUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      (url.hostname === 'facebook.com' ||
        url.hostname.endsWith('.facebook.com')) &&
      (url.pathname === '/login.php' || url.pathname.startsWith('/checkpoint/'))
    );
  } catch {
    return false;
  }
}

export function presentSignInFlow(win: BrowserWindow): void {
  if (!win.isDestroyed()) void win.loadURL(MESSENGER_URL);
}

function errorPagePath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'renderer-static', 'error.html')
    : join(app.getAppPath(), 'src', 'renderer-static', 'error.html');
}

export function attachErrorHandling(win: BrowserWindow): void {
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let showingErrorPage = false;

  win.webContents.on('did-navigate', () => {
    failures = 0;
    showingErrorPage = false;
  });
  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, _description, _url, isMainFrame) => {
      if (!isMainFrame || showingErrorPage || errorCode === -3) return;
      if (retryTimer) clearTimeout(retryTimer);
      failures += 1;
      if (failures <= 3) {
        retryTimer = setTimeout(
          () => {
            retryTimer = undefined;
            void win.loadURL(MESSENGER_URL);
          },
          Math.min(1000 * 2 ** (failures - 1), 4000),
        );
        return;
      }
      showingErrorPage = true;
      void win.loadFile(errorPagePath());
    },
  );
}

export function reportBlockedNavigation(
  win: BrowserWindow,
  rawUrl: string,
  reason: string,
): void {
  showBlockedNavigation(win, rawUrl, reason);
}
