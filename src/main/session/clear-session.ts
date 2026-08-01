import { app, dialog, session, type BrowserWindow } from 'electron';
import { messengerSession } from './partition';
import { saveZoomLevel } from '../window/bounds-store';

const MESSENGER_URL = 'https://www.facebook.com/messages';

export function requestClearSession(window: BrowserWindow): void {
  void dialog
    .showMessageBox(window, {
      type: 'warning',
      buttons: ['Cancel', 'Clear Session Data'],
      defaultId: 0,
      cancelId: 0,
      title: 'Clear Session Data',
      message: 'Clear Messenger session data?',
      detail: 'You will need to sign in again.',
    })
    .then(({ response }) => {
      if (response !== 1) return;
      const messenger = messengerSession();
      return Promise.all([
        messenger.clearStorageData(),
        messenger.clearCache(),
        session.defaultSession.clearAuthCache(),
      ]).then(() => {
        app.setBadgeCount(0);
        window.webContents.setZoomLevel(0);
        saveZoomLevel(0);
        void window.loadURL(MESSENGER_URL);
      });
    });
}
