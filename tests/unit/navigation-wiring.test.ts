import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, WebContents } from 'electron';

const { openExternal, fromWebContents, showMessageBox } = vi.hoisted(() => ({
  openExternal: vi.fn().mockResolvedValue(undefined),
  fromWebContents: vi.fn(() => ({ id: 1 })),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
}));

vi.mock('electron', () => ({
  shell: { openExternal },
  dialog: { showMessageBox },
  BrowserWindow: { fromWebContents },
}));

import { attachNavigationHandlers } from '../../src/main/security/navigation';

function createHarness() {
  const webContents = new EventEmitter() as EventEmitter & {
    setWindowOpenHandler: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  };
  webContents.setWindowOpenHandler = vi.fn();
  webContents.loadURL = vi.fn().mockResolvedValue(undefined);
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
  beforeEach(() => {
    openExternal.mockClear();
    showMessageBox.mockClear();
  });

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

  it('allows the blank placeholder popup Meta stages before the real surface', () => {
    const { webContents } = createHarness();
    const handler = webContents.setWindowOpenHandler.mock
      .calls[0]![0] as (details: { url: string }) => { action: string };
    expect(handler({ url: 'about:blank' }).action).toBe('allow');
  });

  it('does not cancel or warn when a staged popup navigates to about:blank', () => {
    const { webContents } = createHarness();
    const preventDefault = vi.fn();
    webContents.emit('will-navigate', { preventDefault }, 'about:blank');
    expect(preventDefault).not.toHaveBeenCalled();
    expect(showMessageBox).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('tolerates the fragment Meta signals on its blank WebAuthn bridge', () => {
    const { webContents } = createHarness();
    webContents.emit('did-navigate-in-page', {}, 'about:blank#g', true);
    expect(webContents.loadURL).not.toHaveBeenCalled();
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('ignores an in-page navigation that happened inside a subframe', () => {
    const { webContents } = createHarness();
    webContents.emit('did-navigate-in-page', {}, 'https://evil.test/#x', false);
    expect(webContents.loadURL).not.toHaveBeenCalled();
    expect(showMessageBox).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('still recovers the main frame from an off-policy in-page navigation', () => {
    const { webContents } = createHarness();
    webContents.emit('did-navigate-in-page', {}, 'https://evil.test/#x', true);
    expect(webContents.loadURL).toHaveBeenCalledWith(
      'https://www.facebook.com/messages',
    );
    expect(openExternal).toHaveBeenCalledWith('https://evil.test/#x');
  });

  it('still blocks a genuinely unsafe scheme with a warning', () => {
    const { webContents } = createHarness();
    const preventDefault = vi.fn();
    webContents.emit('will-navigate', { preventDefault }, 'file:///etc/passwd');
    expect(preventDefault).toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalled();
  });

  it('leaves an about:blank in-page navigation on its own surface', () => {
    const { webContents } = createHarness();
    webContents.emit('did-navigate-in-page', {}, 'about:blank', true);
    expect(webContents.loadURL).not.toHaveBeenCalled();
    expect(showMessageBox).not.toHaveBeenCalled();
  });
});
