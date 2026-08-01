import { BrowserWindow, type Session, type WebContents } from 'electron';
import { openExternalUrl } from './external-open';
import { decide } from './policy';
import { showBlockedNavigation } from '../features/dialogs';

type PopupOptions = () => Electron.BrowserWindowConstructorOptions;

function handleNavigation(
  rawUrl: string,
  cancel: () => void,
  webContents: WebContents,
): void {
  const decision = decide(rawUrl);
  if (decision.action === 'allow-in-app') return;
  cancel();
  if (decision.action === 'open-external') void openExternalUrl(rawUrl);
  if (decision.action === 'block') {
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) showBlockedNavigation(win, rawUrl, decision.reason);
  }
}

export function attachNavigationHandlers(
  webContents: WebContents,
  ses: Session,
  popupOptions: PopupOptions,
): void {
  webContents.setWindowOpenHandler(({ url }) => {
    const decision = decide(url);
    if (decision.action === 'allow-in-app') {
      return { action: 'allow', overrideBrowserWindowOptions: popupOptions() };
    }
    if (decision.action === 'open-external') void openExternalUrl(url);
    return { action: 'deny' };
  });

  webContents.on('will-navigate', (event, url) => {
    handleNavigation(url, () => event.preventDefault(), webContents);
  });
  webContents.on('will-redirect', (event, url) => {
    handleNavigation(url, () => event.preventDefault(), webContents);
  });

  ses.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'], types: ['mainFrame'] },
    (details, callback) => {
      if (details.resourceType !== 'mainFrame') {
        callback({ cancel: false });
        return;
      }
      const decision = decide(details.url);
      if (decision.action === 'allow-in-app') {
        callback({ cancel: false });
        return;
      }
      if (decision.action === 'open-external')
        void openExternalUrl(details.url);
      callback({ cancel: true });
    },
  );
}
