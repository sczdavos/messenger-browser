import type {
  MediaAccessPermissionRequest,
  PermissionCheckHandlerHandlerDetails,
  PermissionRequest,
  Session,
} from 'electron';
import { evaluatePermission } from './permissions-policy';
import { normalizeOrigin } from './policy/normalize-origin';

function requestOrigin(
  details: PermissionRequest | MediaAccessPermissionRequest,
): string {
  if ('securityOrigin' in details && details.securityOrigin)
    return details.securityOrigin;
  if (details.requestingUrl) {
    try {
      return new URL(details.requestingUrl).origin;
    } catch {
      return '';
    }
  }
  return '';
}

function checkPermission(
  permission: string,
  requestingOrigin: string,
  details: PermissionCheckHandlerHandlerDetails,
): boolean {
  const query =
    details.mediaType === undefined
      ? { permission, requestingOrigin }
      : { permission, requestingOrigin, mediaType: details.mediaType };
  return evaluatePermission(query).granted;
}

export function attachPermissionHandlers(ses: Session): void {
  ses.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      checkPermission(permission, requestingOrigin, details),
  );

  ses.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const origin = requestOrigin(details);
      const mediaTypes =
        'mediaTypes' in details ? details.mediaTypes : undefined;
      callback(
        evaluatePermission({
          permission,
          requestingOrigin: normalizeOrigin(origin) ?? origin,
          ...(mediaTypes === undefined ? {} : { mediaTypes }),
        }).granted,
      );
    },
  );

  ses.setDevicePermissionHandler(() => false);
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
}
