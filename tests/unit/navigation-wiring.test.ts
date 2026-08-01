import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, WebContents } from 'electron';

const { openExternal } = vi.hoisted(() => ({
  openExternal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('electron', () => ({
  shell: { openExternal },
}));

import { attachNavigationHandlers } from '../../src/main/security/navigation';

function createHarness() {
  const webContents = new EventEmitter() as EventEmitter & {
    setWindowOpenHandler: ReturnType<typeof vi.fn>;
  };
  webContents.setWindowOpenHandler = vi.fn();
  let beforeRequest:
    | ((
        details: { resourceType: string; url: string },
        callback: (result: { cancel: boolean }) => void,
      ) => void)
    | undefined;
  const session = {
    webRequest: {
      onBeforeRequest: vi.fn((_filter, listener) => {
        beforeRequest = listener;
      }),
    },
  };
  attachNavigationHandlers(
    webContents as unknown as WebContents,
    session as unknown as Session,
    () => ({ webPreferences: {} }),
  );
  return { webContents, session, getBeforeRequest: () => beforeRequest };
}

describe('navigation enforcement wiring', () => {
  beforeEach(() => openExternal.mockClear());

  it('registers a main-frame-only webRequest filter', () => {
    const { session } = createHarness();
    expect(session.webRequest.onBeforeRequest).toHaveBeenCalledWith(
      { urls: ['<all_urls>'], types: ['mainFrame'] },
      expect.any(Function),
    );
  });

  it('leaves CDN subresources untouched', () => {
    const { getBeforeRequest } = createHarness();
    const callback = vi.fn();
    getBeforeRequest()?.(
      { resourceType: 'script', url: 'https://static.xx.fbcdn.net/app.js' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith({ cancel: false });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('cancels and routes an external main-frame request', () => {
    const { getBeforeRequest } = createHarness();
    const callback = vi.fn();
    getBeforeRequest()?.(
      { resourceType: 'mainFrame', url: 'https://example.com/article' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith({ cancel: true });
    expect(openExternal).toHaveBeenCalledWith('https://example.com/article');
  });

  it("allows Meta's observed placeholder before the group-call popup navigates", () => {
    const { webContents } = createHarness();
    const handler = webContents.setWindowOpenHandler.mock
      .calls[0]![0] as (details: { url: string }) => { action: string };
    expect(handler({ url: 'nullblank' }).action).toBe('allow');
  });

  it('allows a generic blank call placeholder without allowing it as navigation', () => {
    const { webContents } = createHarness();
    const handler = webContents.setWindowOpenHandler.mock
      .calls[0]![0] as (details: { url: string }) => { action: string };
    expect(handler({ url: 'about:blank' }).action).toBe('allow');
  });
});
