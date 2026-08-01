export const EXTERNAL_SCHEMES: ReadonlySet<string> = new Set([
  'https:',
  'http:',
  'mailto:',
  'tel:',
]);

export function isExternalScheme(scheme: string): boolean {
  return EXTERNAL_SCHEMES.has(scheme);
}
