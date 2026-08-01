import type { Rectangle } from 'electron';

export interface AppSettings {
  readonly schemaVersion: 1;
  readonly windowBounds?: Rectangle;
  readonly zoomLevel?: number;
}

const ALLOWED_KEYS = new Set(['schemaVersion', 'windowBounds', 'zoomLevel']);

function validBounds(value: unknown): value is Rectangle {
  if (!value || typeof value !== 'object') return false;
  const bounds = value as Partial<Rectangle>;
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(
    (item) => typeof item === 'number' && Number.isFinite(item),
  );
}

export function parseSettings(value: unknown): AppSettings | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!Object.keys(record).every((key) => ALLOWED_KEYS.has(key))) return null;
  if (record.schemaVersion !== 1) return null;
  if (record.windowBounds !== undefined && !validBounds(record.windowBounds))
    return null;
  if (
    record.zoomLevel !== undefined &&
    (typeof record.zoomLevel !== 'number' || !Number.isFinite(record.zoomLevel))
  ) {
    return null;
  }
  return record as unknown as AppSettings;
}
