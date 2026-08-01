import { test, expect } from '@playwright/test';
import { attachPermissionHandlers } from '../../src/main/security/permissions';

test('permission handlers remain bounded and origin-specific', () => {
  let checkHandler: ((...args: unknown[]) => boolean) | undefined;
  let requestHandler: ((...args: unknown[]) => void) | undefined;
  const session = {
    setPermissionCheckHandler: (handler: unknown) => {
      checkHandler = handler as typeof checkHandler;
    },
    setPermissionRequestHandler: (handler: unknown) => {
      requestHandler = handler as typeof requestHandler;
    },
    setDevicePermissionHandler: () => undefined,
    setDisplayMediaRequestHandler: () => undefined,
  };
  attachPermissionHandlers(session as never);
  if (!checkHandler || !requestHandler)
    throw new Error('handlers not registered');

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

  let result = false;
  requestHandler(
    null,
    'geolocation',
    (granted: boolean) => {
      result = granted;
    },
    {
      securityOrigin: 'https://www.facebook.com',
      requestingUrl: 'https://www.facebook.com/messages',
    },
  );
  expect(result).toBe(false);
});
