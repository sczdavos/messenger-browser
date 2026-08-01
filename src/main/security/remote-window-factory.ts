import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
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

export function hardenedPopupOptions(): BrowserWindowConstructorOptions {
  return { webPreferences: HARDENED_REMOTE_WEB_PREFERENCES };
}

export function attachRemoteHandlers(win: BrowserWindow): void {
  const ses = messengerSession();
  attachPermissionHandlers(ses);
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
  void win.loadURL(initialUrl);
  return win;
}
