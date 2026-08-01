import { app, type BrowserWindow } from 'electron';

const MAX_BADGE = 999;

export function parseBadgeTitle(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^\((\d+)(?:\+)?\)/.exec(value);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isSafeInteger(count)) return null;
  return Math.min(count, MAX_BADGE);
}

export function attachBadgeHandler(window: BrowserWindow): void {
  window.webContents.on('page-title-updated', (_event, title) => {
    app.setBadgeCount(parseBadgeTitle(title) ?? 0);
  });
}
