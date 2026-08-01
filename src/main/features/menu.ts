import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { decide } from '../security/policy';
import { showAbout } from './about';
import { requestClearSession } from '../session/clear-session';
import { loadZoomLevel, saveZoomLevel } from '../window/bounds-store';

export const MESSENGER_HOME = 'https://www.facebook.com/messages';

type WindowProvider = () => BrowserWindow | null;

function focusedWindow(provider: WindowProvider): BrowserWindow | null {
  const window = provider() ?? BrowserWindow.getFocusedWindow();
  return window && !window.isDestroyed() ? window : null;
}

function historyTargetIsAllowed(
  window: BrowserWindow,
  direction: 'back' | 'forward',
): boolean {
  const history = window.webContents.navigationHistory;
  const activeIndex = history.getActiveIndex();
  const targetIndex = direction === 'back' ? activeIndex - 1 : activeIndex + 1;
  const entries = history.getAllEntries();
  if (targetIndex < 0 || targetIndex >= entries.length) return false;
  return (
    decide(history.getEntryAtIndex(targetIndex).url).action === 'allow-in-app'
  );
}

export function buildApplicationMenu(provider: WindowProvider): Menu {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'MessengerBrowser',
      submenu: [
        {
          label: 'About MessengerBrowser',
          click: () => {
            const window = focusedWindow(provider);
            if (window) showAbout(window);
          },
        },
        {
          label: 'Clear Session Data…',
          click: () => {
            const window = focusedWindow(provider);
            if (window) requestClearSession(window);
          },
        },
        { type: 'separator' },
        ...(isMac ? [{ role: 'services' as const }] : []),
        { type: 'separator' },
        { role: 'hide' },
        ...(isMac
          ? [{ role: 'hideOthers' as const }, { role: 'unhide' as const }]
          : []),
        { type: 'separator' },
        { role: 'quit', label: 'Quit MessengerBrowser' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        {
          label: 'Open Messenger Home',
          accelerator: 'Shift+CmdOrCtrl+H',
          click: () => {
            const window = focusedWindow(provider);
            if (window) void window.loadURL(MESSENGER_HOME);
          },
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            const window = focusedWindow(provider);
            if (!window) return;
            window.webContents.setZoomLevel(0);
            saveZoomLevel(0);
          },
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            const window = focusedWindow(provider);
            if (!window) return;
            const level = window.webContents.getZoomLevel() + 1;
            window.webContents.setZoomLevel(level);
            saveZoomLevel(level);
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const window = focusedWindow(provider);
            if (!window) return;
            const level = window.webContents.getZoomLevel() - 1;
            window.webContents.setZoomLevel(level);
            saveZoomLevel(level);
          },
        },
        { role: 'togglefullscreen', accelerator: 'Ctrl+Cmd+F' },
      ],
    },
    {
      label: 'History',
      submenu: [
        {
          id: 'history-back',
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          enabled: false,
          click: () => {
            const window = focusedWindow(provider);
            if (window && historyTargetIsAllowed(window, 'back')) {
              window.webContents.navigationHistory.goBack();
            }
          },
        },
        {
          id: 'history-forward',
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          enabled: false,
          click: () => {
            const window = focusedWindow(provider);
            if (window && historyTargetIsAllowed(window, 'forward')) {
              window.webContents.navigationHistory.goForward();
            }
          },
        },
      ],
    },
    { role: 'windowMenu' },
  ];

  const menu = Menu.buildFromTemplate(template);
  const updateHistory = (): void => {
    const window = focusedWindow(provider);
    const historyMenu = menu.getMenuItemById('history-back');
    const forwardMenu = menu.getMenuItemById('history-forward');
    if (!historyMenu || !forwardMenu || !window) return;
    historyMenu.enabled = historyTargetIsAllowed(window, 'back');
    forwardMenu.enabled = historyTargetIsAllowed(window, 'forward');
  };
  const window = focusedWindow(provider);
  window?.webContents.on('did-navigate', updateHistory);
  window?.webContents.on('did-navigate-in-page', updateHistory);
  return menu;
}

export function installApplicationMenu(provider: WindowProvider): void {
  const menu = buildApplicationMenu(provider);
  Menu.setApplicationMenu(menu);
  const window = focusedWindow(provider);
  if (window) window.webContents.setZoomLevel(loadZoomLevel());
}
