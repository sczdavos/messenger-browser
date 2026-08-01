import { shell } from 'electron';
import { isExternalScheme } from './policy/external-schemes';

export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  try {
    const url = new URL(rawUrl);
    if (!isExternalScheme(url.protocol)) return false;
    await shell.openExternal(rawUrl);
    return true;
  } catch {
    return false;
  }
}
