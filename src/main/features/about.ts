import { app, dialog, type BrowserWindow } from 'electron';

export function showAbout(window: BrowserWindow): void {
  void dialog.showMessageBox(window, {
    title: 'About MessengerBrowser',
    message: `MessengerBrowser ${app.getVersion()}`,
    detail:
      'MessengerBrowser is an independent application and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.',
  });
}
