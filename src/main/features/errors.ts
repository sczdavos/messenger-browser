import type { BrowserWindow } from 'electron';

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
