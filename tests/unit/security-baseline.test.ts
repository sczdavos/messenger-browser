import { describe, expect, it } from 'vitest';
import { HARDENED_REMOTE_WEB_PREFERENCES } from '../../src/main/security/remote-window-factory';
import { evaluatePermission } from '../../src/main/security/permissions-policy';
import { decide } from '../../src/main/security/policy';

describe('security baseline', () => {
  it('keeps the remote renderer hardened and session-scoped', () => {
    expect(HARDENED_REMOTE_WEB_PREFERENCES).toEqual({
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      backgroundThrottling: true,
      partition: 'persist:messenger',
    });
    expect('preload' in HARDENED_REMOTE_WEB_PREFERENCES).toBe(false);
  });

  it('keeps navigability separate from device permission', () => {
    expect(decide('https://www.messenger.com/messages').action).toBe(
      'allow-in-app',
    );
    expect(
      evaluatePermission({
        permission: 'media',
        requestingOrigin: 'https://www.messenger.com',
        mediaType: 'audio',
      }).granted,
    ).toBe(false);
    expect(
      evaluatePermission({
        permission: 'notifications',
        requestingOrigin: 'https://www.facebook.com',
      }).granted,
    ).toBe(true);
  });

  it('denies every unknown permission at the approved origin', () => {
    const permissions = [
      'clipboard-read',
      'geolocation',
      'fullscreen',
      'hid',
      'idle-detection',
      'mediaKeySystem',
      'midi',
      'midiSysex',
      'openExternal',
      'pointerLock',
      'serial',
      'storage-access',
      'usb',
      'fileSystem',
      'future-permission-2027',
    ];
    for (const permission of permissions) {
      expect(
        evaluatePermission({
          permission,
          requestingOrigin: 'https://www.facebook.com',
        }).granted,
      ).toBe(false);
    }
  });
});
