import { BrowserWindow, type Session, type WebContents } from 'electron';
import { openExternalUrl } from './external-open';
import { decide } from './policy';
import { showBlockedNavigation } from '../features/dialogs';

type PopupOptions = () => Electron.BrowserWindowConstructorOptions;

const MESSENGER_HOME = 'https://www.facebook.com/messages';
const navigationSessions = new WeakSet<Session>();

function isObservedCallPlaceholder(url: string): boolean {
  return url === 'nullblank';
}

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
    // Meta first creates a placeholder popup and then navigates it to the
    // allowlisted /groupcall/ROOM:... surface.
    if (isObservedCallPlaceholder(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: popupOptions() };
    }
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
  webContents.on('did-navigate-in-page', (_event, url) => {
    const decision = decide(url);
    if (decision.action === 'allow-in-app') return;
    if (decision.action === 'open-external') void openExternalUrl(url);
    if (decision.action === 'block') {
      const win = BrowserWindow.fromWebContents(webContents);
      if (win) showBlockedNavigation(win, url, decision.reason);
    }
    void webContents.loadURL(MESSENGER_HOME);
  });

  if (navigationSessions.has(ses)) return;
  navigationSessions.add(ses);
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
