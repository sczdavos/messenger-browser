import { app, type BrowserWindow } from 'electron';
import { createMainWindow } from './window/main-window';

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;
  let isQuitting = false;

  const newMainWindow = (): BrowserWindow => {
    const window = createMainWindow();
    window.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        window.hide();
      }
    });
    return window;
  };

  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = newMainWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = newMainWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    mainWindow = newMainWindow();
  });
}
