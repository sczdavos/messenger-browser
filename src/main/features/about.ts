import { app, type BrowserWindow } from 'electron';
import { createAboutWindow } from '../security/remote-window-factory';

let aboutWindow: BrowserWindow | null = null;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );
}

function aboutMarkup(version: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>About MessengerBrowser</title>
    <style>
      :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      body { margin: 0; padding: 30px; text-align: center; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 8px 0; line-height: 1.4; }
      .version { opacity: .7; }
      .disclaimer { margin-top: 22px; font-size: 12px; opacity: .7; }
    </style>
  </head>
  <body>
    <h1>MessengerBrowser</h1>
    <p class="version">Version ${escapeHtml(version)}</p>
    <p>An independent application for the official Facebook Messenger web experience.</p>
    <p class="disclaimer">Not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.</p>
  </body>
</html>`;
}

export function showAbout(window: BrowserWindow): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }
  aboutWindow = createAboutWindow(window);
  aboutWindow.once('closed', () => {
    aboutWindow = null;
  });
  aboutWindow.webContents.on('before-input-event', (event, input) => {
    const isCloseShortcut =
      (input.meta && input.key.toLowerCase() === 'w') || input.key === 'Escape';
    if (!isCloseShortcut) return;
    event.preventDefault();
    aboutWindow?.close();
  });
  void aboutWindow
    .loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(aboutMarkup(app.getVersion()))}`,
    )
    .then(() => aboutWindow?.show());
}
