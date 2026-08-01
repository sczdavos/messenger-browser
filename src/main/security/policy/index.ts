import { AUTH_ALLOWLIST } from './auth-allowlist';
import { isExternalScheme } from './external-schemes';
import { NAVIGATION_ALLOWLIST } from './navigation-allowlist';
import type { AllowlistRule, NavigationDecision } from './types';

function hostMatches(hostname: string, ruleHost: string): boolean {
  return hostname === ruleHost || hostname.endsWith(`.${ruleHost}`);
}

function pathMatches(pathname: string, rule: AllowlistRule): boolean {
  if (rule.paths === 'any') return true;
  return rule.paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function matchAllowlist(
  url: URL,
  rules: readonly AllowlistRule[],
): AllowlistRule | undefined {
  return rules.find(
    (rule) =>
      hostMatches(url.hostname, rule.host) && pathMatches(url.pathname, rule),
  );
}

export function decide(rawUrl: string): NavigationDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { action: 'block', reason: 'malformed-url' };
  }

  if (url.username !== '' || url.password !== '') {
    return { action: 'block', reason: 'has-userinfo' };
  }

  if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
    return { action: 'open-external' };
  }

  const matchingRule =
    matchAllowlist(url, NAVIGATION_ALLOWLIST) ??
    matchAllowlist(url, AUTH_ALLOWLIST);

  if (url.protocol === 'http:') {
    return matchingRule
      ? { action: 'block', reason: 'not-https' }
      : { action: 'open-external' };
  }

  if (!isExternalScheme(url.protocol)) {
    return { action: 'block', reason: 'unsafe-scheme' };
  }

  return matchingRule
    ? { action: 'allow-in-app', matchedRule: matchingRule }
    : { action: 'open-external' };
}

export type { AllowlistRule, BlockReason, NavigationDecision } from './types';
export { permittedPermissions } from './permission-origins';
