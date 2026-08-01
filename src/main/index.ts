import { app, type BrowserWindow } from 'electron';
import { installApplicationMenu } from './features/menu';
import { createMainWindow } from './window/main-window';
import { flushBounds } from './window/bounds-store';

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
    flushBounds();
  });

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = newMainWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    mainWindow = newMainWindow();
    installApplicationMenu(() => mainWindow);
  });
}
