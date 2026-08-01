import { normalizeOrigin } from './policy/normalize-origin';
import { permittedPermissions } from './policy';
import type { PermissionDecision, PermissionQuery } from './policy/types';

export function evaluatePermission(query: PermissionQuery): PermissionDecision {
  const origin = normalizeOrigin(query.requestingOrigin);
  if (origin === null) return { granted: false, reason: 'invalid-origin' };

  if (!permittedPermissions(origin).has(query.permission)) {
    return { granted: false, reason: 'origin-or-permission-not-approved' };
  }

  if (query.permission === 'media') {
    const types =
      query.mediaTypes ??
      (query.mediaType === undefined ? [] : [query.mediaType]);
    const granted =
      types.length > 0 &&
      types.every((type) => type === 'audio' || type === 'video');
    return granted
      ? { granted: true, reason: 'approved-media-origin-and-types' }
      : { granted: false, reason: 'media-types-not-approved' };
  }

  if (query.permission === 'notifications') {
    return { granted: true, reason: 'approved-notification-origin' };
  }

  return { granted: false, reason: 'permission-not-approved' };
}

export type { PermissionDecision, PermissionQuery } from './policy/types';
