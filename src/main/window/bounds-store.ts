import { app, screen, type Rectangle } from 'electron';
import { join } from 'node:path';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseSettings, type AppSettings } from '../session/settings';

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const FILE_NAME = 'settings.json';

function settingsPath(): string {
  return join(app.getPath('userData'), FILE_NAME);
}

function loadSettings(): AppSettings | undefined {
  if (!existsSync(settingsPath())) return undefined;
  try {
    return (
      parseSettings(JSON.parse(readFileSync(settingsPath(), 'utf8'))) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

function clampToDisplays(bounds: Rectangle): Rectangle {
  const displays = screen.getAllDisplays();
  const workArea =
    displays.find(
      (display) =>
        display.workArea.x < bounds.x + bounds.width &&
        display.workArea.x + display.workArea.width > bounds.x &&
        display.workArea.y < bounds.y + bounds.height &&
        display.workArea.y + display.workArea.height > bounds.y,
    )?.workArea ?? screen.getPrimaryDisplay().workArea;
  return {
    x: Math.min(
      Math.max(bounds.x, workArea.x),
      workArea.x + workArea.width - MIN_WIDTH,
    ),
    y: Math.min(
      Math.max(bounds.y, workArea.y),
      workArea.y + workArea.height - MIN_HEIGHT,
    ),
    width: Math.max(bounds.width, MIN_WIDTH),
    height: Math.max(bounds.height, MIN_HEIGHT),
  };
}

export function loadBounds(): Rectangle | undefined {
  const settings = loadSettings();
  return settings?.windowBounds
    ? clampToDisplays(settings.windowBounds)
    : undefined;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingBounds: Rectangle | undefined;

function writeSettings(data: AppSettings): void {
  const path = settingsPath();
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(data));
  renameSync(tempPath, path);
}

export function loadZoomLevel(): number {
  return loadSettings()?.zoomLevel ?? 0;
}

export function saveZoomLevel(zoomLevel: number): void {
  const existing = loadSettings();
  writeSettings({
    schemaVersion: 1,
    ...(existing?.windowBounds ? { windowBounds: existing.windowBounds } : {}),
    zoomLevel,
  });
}

export function flushBounds(): void {
  if (saveTimer) clearTimeout(saveTimer);
  if (!pendingBounds) return;
  const existing = loadSettings();
  writeSettings({
    schemaVersion: 1,
    windowBounds: clampToDisplays(pendingBounds),
    ...(existing?.zoomLevel !== undefined
      ? { zoomLevel: existing.zoomLevel }
      : {}),
  });
  pendingBounds = undefined;
  saveTimer = undefined;
}

export function saveBounds(bounds: Rectangle): void {
  if (saveTimer) clearTimeout(saveTimer);
  pendingBounds = bounds;
  saveTimer = setTimeout(() => {
    flushBounds();
  }, 500);
}
