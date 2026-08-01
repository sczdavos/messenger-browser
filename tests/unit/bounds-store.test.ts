import { beforeEach, describe, expect, it, vi } from 'vitest';

const { files, displays } = vi.hoisted(() => ({
  files: {} as Record<string, string>,
  displays: [{ workArea: { x: 0, y: 0, width: 1440, height: 900 } }],
}));

vi.mock('electron', () => ({
  app: { getPath: () => '/user-data' },
  screen: {
    getAllDisplays: () => displays,
    getPrimaryDisplay: () => displays[0],
  },
}));

vi.mock('node:fs', () => ({
  existsSync: (path: string) => path in files,
  readFileSync: (path: string) => files[path],
  writeFileSync: (path: string, value: string) => {
    files[path] = value;
  },
  renameSync: (from: string, to: string) => {
    files[to] = files[from] ?? '';
    delete files[from];
  },
}));

import {
  flushBounds,
  loadBounds,
  loadZoomLevel,
  saveBounds,
  saveZoomLevel,
} from '../../src/main/window/bounds-store';

describe('window settings persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const key of Object.keys(files)) delete files[key];
  });

  it('recovers from truncated or privacy-invalid settings', () => {
    files['/user-data/settings.json'] = '{';
    expect(loadBounds()).toBeUndefined();
    files['/user-data/settings.json'] = JSON.stringify({
      schemaVersion: 1,
      cookies: 'should-not-be-here',
    });
    expect(loadBounds()).toBeUndefined();
  });

  it('atomically saves bounds and clamps them to the display', () => {
    saveBounds({ x: -500, y: -500, width: 100, height: 100 });
    vi.runAllTimers();
    expect(files['/user-data/settings.json']).toBe(
      JSON.stringify({
        schemaVersion: 1,
        windowBounds: { x: 0, y: 0, width: 800, height: 600 },
      }),
    );
    expect(files['/user-data/settings.json.tmp']).toBeUndefined();
  });

  it('preserves zoom when bounds are saved and restores zoom', () => {
    saveZoomLevel(1.25);
    saveBounds({ x: 100, y: 100, width: 1000, height: 700 });
    vi.runAllTimers();
    expect(loadZoomLevel()).toBe(1.25);
    expect(loadBounds()).toEqual({ x: 100, y: 100, width: 1000, height: 700 });
  });

  it('flushes pending bounds synchronously for quit', () => {
    saveBounds({ x: 10, y: 20, width: 900, height: 700 });
    flushBounds();
    expect(loadBounds()).toEqual({ x: 10, y: 20, width: 900, height: 700 });
  });
});
