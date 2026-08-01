export function normalizeOrigin(raw: string): string | null {
  if (raw === 'null' || raw.length === 0) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}
