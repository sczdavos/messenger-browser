import { describe, expect, it, vi } from 'vitest';
import { attachPermissionHandlers } from '../../src/main/security/permissions';

describe('permission handler wiring', () => {
  it('handles null webContents and keeps decisions origin-specific', () => {
    let checkHandler: (...args: unknown[]) => boolean = () => false;
    let requestHandler: (...args: unknown[]) => void = () => undefined;
    const session = {
      setPermissionCheckHandler: vi.fn((handler) => {
        checkHandler = handler as typeof checkHandler;
      }),
      setPermissionRequestHandler: vi.fn((handler) => {
        requestHandler = handler as typeof requestHandler;
      }),
      setDevicePermissionHandler: vi.fn(),
      setDisplayMediaRequestHandler: vi.fn(),
    };
    attachPermissionHandlers(session as never);

    expect(
      checkHandler(null, 'media', 'https://www.facebook.com', {
        mediaType: 'audio',
      }),
    ).toBe(true);
    expect(
      checkHandler(null, 'media', 'https://www.messenger.com', {
        mediaType: 'audio',
      }),
    ).toBe(false);
    expect(
      checkHandler(null, 'notifications', 'https://www.facebook.com', {}),
    ).toBe(true);

    const callback = vi.fn();
    requestHandler(null, 'notifications', callback, {
      securityOrigin: 'https://www.facebook.com',
      requestingUrl: 'https://www.facebook.com/messages',
    });
    expect(callback).toHaveBeenCalledWith(true);
    expect(session.setDevicePermissionHandler).toHaveBeenCalled();
    expect(session.setDisplayMediaRequestHandler).toHaveBeenCalled();
  });
});
