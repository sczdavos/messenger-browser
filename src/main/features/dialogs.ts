import { dialog, systemPreferences, type BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';

type MediaKind = 'camera' | 'microphone';

const SETTINGS_URLS: Record<MediaKind, string> = {
  camera:
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
  microphone:
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
};

function openMediaSettings(kind: MediaKind): void {
  execFile('open', [SETTINGS_URLS[kind]]);
}

export async function ensureMediaAccess(
  window: BrowserWindow | null,
  kinds: readonly MediaKind[],
): Promise<boolean> {
  for (const kind of kinds) {
    const status = systemPreferences.getMediaAccessStatus(kind);
    if (status === 'granted') continue;
    if (status === 'not-determined') {
      if (await systemPreferences.askForMediaAccess(kind)) continue;
    }
    if (window && !window.isDestroyed()) {
      const { response } = await dialog.showMessageBox(window, {
        type: 'warning',
        buttons: ['Cancel', 'Open Settings'],
        defaultId: 1,
        cancelId: 0,
        title: `${kind === 'camera' ? 'Camera' : 'Microphone'} access required`,
        message: `MessengerBrowser cannot use the ${kind} until macOS access is enabled.`,
        detail:
          'After changing this setting, restart MessengerBrowser if macOS requests it.',
      });
      if (response === 1) openMediaSettings(kind);
    }
    return false;
  }
  return true;
}

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
