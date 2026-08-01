import type { Session, WebContents } from 'electron';
import { openExternalUrl } from './external-open';
import { decide } from './policy';

type PopupOptions = () => Electron.BrowserWindowConstructorOptions;

function handleNavigation(rawUrl: string, cancel: () => void): void {
  const decision = decide(rawUrl);
  if (decision.action === 'allow-in-app') return;
  cancel();
  if (decision.action === 'open-external') void openExternalUrl(rawUrl);
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
    handleNavigation(url, () => event.preventDefault());
  });
  webContents.on('will-redirect', (event, url) => {
    handleNavigation(url, () => event.preventDefault());
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
