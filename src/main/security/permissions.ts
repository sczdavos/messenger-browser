import type {
  MediaAccessPermissionRequest,
  PermissionCheckHandlerHandlerDetails,
  PermissionRequest,
  Session,
} from 'electron';
import { evaluatePermission } from './permissions-policy';
import { trace } from './nav-trace';
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
    (_webContents, permission, requestingOrigin, details) => {
      const granted = checkPermission(permission, requestingOrigin, details);
      trace(
        'permission-check',
        granted ? 'granted' : 'denied',
        `${permission} @ ${requestingOrigin}`,
      );
      return granted;
    },
  );

  ses.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const origin = requestOrigin(details);
      const mediaTypes =
        'mediaTypes' in details ? details.mediaTypes : undefined;
      const requestingOrigin = normalizeOrigin(origin) ?? origin;
      const grantedByPolicy = evaluatePermission({
        permission,
        requestingOrigin,
        ...(mediaTypes === undefined ? {} : { mediaTypes }),
      }).granted;
      trace(
        'permission-request',
        grantedByPolicy ? 'granted' : 'denied',
        `${permission} @ ${requestingOrigin}`,
      );
      if (!grantedByPolicy || permission !== 'media') {
        callback(grantedByPolicy);
        return;
      }
      const kinds = (mediaTypes ?? []).filter(
        (type): type is 'audio' | 'video' =>
          type === 'audio' || type === 'video',
      );
      void Promise.all([
        import('electron'),
        import('../features/dialogs'),
      ]).then(([{ BrowserWindow }, { ensureMediaAccess }]) => {
        const window = _webContents
          ? BrowserWindow.fromWebContents(_webContents)
          : null;
        return ensureMediaAccess(
          window,
          kinds.includes('video') && kinds.includes('audio')
            ? ['camera', 'microphone']
            : kinds.includes('video')
              ? ['camera']
              : ['microphone'],
        ).then(callback);
      });
    },
  );

  ses.setDevicePermissionHandler((details) => {
    trace('device-permission', 'denied', details.deviceType);
    return false;
  });
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
}
