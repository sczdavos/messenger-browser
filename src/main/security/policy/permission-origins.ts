import type { PermissionName } from './types';

export const PERMISSION_ORIGINS: ReadonlyMap<
  string,
  ReadonlySet<PermissionName>
> = new Map([['https://www.facebook.com', new Set(['media'])]]);

export function permittedPermissions(
  origin: string,
): ReadonlySet<PermissionName> {
  return PERMISSION_ORIGINS.get(origin) ?? new Set<PermissionName>();
}
