import { app, screen, type Rectangle } from 'electron';
import { join } from 'node:path';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const FILE_NAME = 'settings.json';

interface SettingsFile {
  readonly schemaVersion: 1;
  readonly windowBounds?: Rectangle;
}

function settingsPath(): string {
  return join(app.getPath('userData'), FILE_NAME);
}

function validBounds(value: unknown): value is Rectangle {
  if (!value || typeof value !== 'object') return false;
  const bounds = value as Partial<Rectangle>;
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(
    (item) => typeof item === 'number' && Number.isFinite(item),
  );
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
  if (!existsSync(settingsPath())) return undefined;
  try {
    const parsed = JSON.parse(
      readFileSync(settingsPath(), 'utf8'),
    ) as Partial<SettingsFile>;
    return validBounds(parsed.windowBounds)
      ? clampToDisplays(parsed.windowBounds)
      : undefined;
  } catch {
    return undefined;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function saveBounds(bounds: Rectangle): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const path = settingsPath();
    const tempPath = `${path}.tmp`;
    const data: SettingsFile = {
      schemaVersion: 1,
      windowBounds: clampToDisplays(bounds),
    };
    writeFileSync(tempPath, JSON.stringify(data));
    renameSync(tempPath, path);
    saveTimer = undefined;
  }, 500);
}
