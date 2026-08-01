import {
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  type Session,
} from 'electron';
import { attachDownloadHandler } from '../features/downloads';
import { attachNavigationHandlers } from './navigation';
import { attachPermissionHandlers } from './permissions';
import { messengerSession } from '../session/partition';

export const HARDENED_REMOTE_WEB_PREFERENCES = Object.freeze({
  sandbox: true,
  contextIsolation: true,
  webSecurity: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webviewTag: false,
  // S-6 selected default throttling: lowest sufficient rung with acceptable idle cost.
  backgroundThrottling: true,
  partition: 'persist:messenger',
});

const downloadHandlersAttached = new WeakSet<Session>();

function attachDownloadHandlerOnce(session: Session): void {
  if (downloadHandlersAttached.has(session)) return;
  downloadHandlersAttached.add(session);
  attachDownloadHandler(session);
}

export function hardenedPopupOptions(): BrowserWindowConstructorOptions {
  return { webPreferences: HARDENED_REMOTE_WEB_PREFERENCES };
}

export function createAboutWindow(parent: BrowserWindow): BrowserWindow {
  return new BrowserWindow({
    width: 420,
    height: 250,
    minWidth: 420,
    minHeight: 250,
    maxWidth: 420,
    maxHeight: 250,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent,
    modal: false,
    show: false,
    frame: true,
    closable: true,
    titleBarStyle: 'default',
    title: 'About MessengerBrowser',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
    },
  });
}

export function attachRemoteHandlers(win: BrowserWindow): void {
  const ses = messengerSession();
  attachPermissionHandlers(ses);
  attachDownloadHandlerOnce(ses);
  attachNavigationHandlers(win.webContents, ses, hardenedPopupOptions);
  win.webContents.on('did-create-window', (popup) =>
    attachRemoteHandlers(popup),
  );
}

export function createRemoteWindow(initialUrl: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: HARDENED_REMOTE_WEB_PREFERENCES,
  });
  attachRemoteHandlers(win);
  // The caller loads after attaching its feature handlers so an immediate
  // offline failure cannot race past error handling.
  void initialUrl;
  return win;
}
