import { BrowserWindow, type Session, type WebContents } from 'electron';
import { openExternalUrl } from './external-open';
import { decide } from './policy';
import { trace } from './nav-trace';
import { showBlockedNavigation } from '../features/dialogs';

type PopupOptions = () => Electron.BrowserWindowConstructorOptions;

const MESSENGER_HOME = 'https://www.facebook.com/messages';
const navigationSessions = new WeakSet<Session>();

function isInertBlankDocument(rawUrl: string): boolean {
  // Meta stages its call popup, and its passkey/WebAuthn bridge frame, as an
  // empty document before driving it to the real surface -- the bridge signals
  // through the fragment (`about:blank#g`), so the query and hash have to be
  // tolerated too. An empty document has no content and no origin, and any
  // navigation that follows is still enforced by these same handlers, so
  // tolerating it widens nothing. `decide()` keeps its own
  // `about:blank -> unsafe-scheme` verdict; the tolerance belongs here, in the
  // wiring layer.
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'about:' && url.pathname === 'blank';
  } catch {
    return false;
  }
}

function handleNavigation(
  rawUrl: string,
  cancel: () => void,
  webContents: WebContents,
  layer: string,
): void {
  if (isInertBlankDocument(rawUrl)) {
    trace(layer, 'allow-inert', rawUrl);
    return;
  }
  const decision = decide(rawUrl);
  trace(layer, decision.action, rawUrl);
  if (decision.action === 'allow-in-app') return;
  cancel();
  if (decision.action === 'open-external') void openExternalUrl(rawUrl);
  if (decision.action === 'block') {
    trace(layer, `block:${decision.reason}`, rawUrl);
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
    // allowlisted surface (/groupcall/ROOM:..., login and passkey steps).
    if (isInertBlankDocument(url)) {
      trace('window-open', 'allow-inert', url);
      return { action: 'allow', overrideBrowserWindowOptions: popupOptions() };
    }
    const decision = decide(url);
    trace(
      'window-open',
      decision.action === 'block'
        ? `block:${decision.reason}`
        : decision.action,
      url,
    );
    if (decision.action === 'allow-in-app') {
      return { action: 'allow', overrideBrowserWindowOptions: popupOptions() };
    }
    if (decision.action === 'open-external') void openExternalUrl(url);
    return { action: 'deny' };
  });

  webContents.on('will-navigate', (event, url) => {
    handleNavigation(
      url,
      () => event.preventDefault(),
      webContents,
      'will-navigate',
    );
  });
  webContents.on('will-redirect', (event, url) => {
    handleNavigation(
      url,
      () => event.preventDefault(),
      webContents,
      'will-redirect',
    );
  });
  webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    // Subframes are not part of the top-level navigation policy; a hash change
    // inside an embedded frame must not tear down the page around it.
    if (!isMainFrame) {
      trace('did-navigate-in-page', 'skip-subframe', url);
      return;
    }
    if (isInertBlankDocument(url)) {
      trace('did-navigate-in-page', 'allow-inert', url);
      return;
    }
    const decision = decide(url);
    trace('did-navigate-in-page', decision.action, url);
    if (decision.action === 'allow-in-app') return;
    if (decision.action === 'open-external') void openExternalUrl(url);
    if (decision.action === 'block') {
      trace('did-navigate-in-page', `block:${decision.reason}`, url);
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
      trace(
        'webRequest:mainFrame',
        decision.action === 'block'
          ? `block:${decision.reason}`
          : decision.action,
        details.url,
      );
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
