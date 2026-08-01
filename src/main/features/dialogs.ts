import { dialog, type BrowserWindow } from 'electron';

export function showBlockedNavigation(
  win: BrowserWindow,
  rawUrl: string,
  reason: string,
): void {
  let detail = reason;
  try {
    const url = new URL(rawUrl);
    detail = `${url.origin}${url.pathname} (${reason})`;
  } catch {
    // Keep the policy reason without echoing malformed input into the dialog.
  }
  void dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Navigation blocked',
    message: 'This destination is outside MessengerBrowser.',
    detail,
  });
}
