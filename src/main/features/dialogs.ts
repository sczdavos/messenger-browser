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

const MAX_DETAIL_URL_LENGTH = 120;

export function formatBlockedDetail(rawUrl: string, reason: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // Keep the policy reason without echoing malformed input into the dialog.
    return reason;
  }
  // Opaque-origin schemes (about:, data:, blob: without a host) serialise
  // `origin` to the string "null", which used to render `about:blank` as the
  // meaningless "nullblank". Show the URL itself for those.
  const target =
    url.origin === 'null' ? url.href : `${url.origin}${url.pathname}`;
  const shown =
    target.length > MAX_DETAIL_URL_LENGTH
      ? `${target.slice(0, MAX_DETAIL_URL_LENGTH)}…`
      : target;
  return `${shown} (${reason})`;
}

export function showBlockedNavigation(
  win: BrowserWindow,
  rawUrl: string,
  reason: string,
): void {
  const detail = formatBlockedDetail(rawUrl, reason);
  void dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Navigation blocked',
    message: 'This destination is outside MessengerBrowser.',
    detail,
  });
}
