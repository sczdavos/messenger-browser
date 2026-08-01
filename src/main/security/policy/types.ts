export type AllowlistKind = 'messenger' | 'authentication';

export interface AllowlistRule {
  readonly host: string;
  readonly paths: readonly string[] | 'any';
  readonly kind: AllowlistKind;
}

export type BlockReason =
  'unsafe-scheme' | 'not-https' | 'has-userinfo' | 'malformed-url';

export type NavigationDecision =
  | { readonly action: 'allow-in-app'; readonly matchedRule: AllowlistRule }
  | { readonly action: 'open-external' }
  | { readonly action: 'block'; readonly reason: BlockReason };

export type PermissionName = string;
export type MediaType = 'audio' | 'video' | 'unknown';

export interface PermissionQuery {
  readonly permission: PermissionName;
  readonly requestingOrigin: string;
  readonly mediaType?: MediaType;
  readonly mediaTypes?: readonly MediaType[];
}

export interface PermissionDecision {
  readonly granted: boolean;
  readonly reason: string;
}
