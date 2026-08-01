import type { DownloadItem, Session } from 'electron';

const MAX_FILENAME_LENGTH = 255;

export function safeDownloadFilename(value: unknown): string {
  if (typeof value !== 'string') return 'download';
  const basename = value.split(/[\\/]/).pop() ?? '';
  const cleaned = basename
    .split(String.fromCharCode(0))
    .join('')
    .replace(/\.\.+/g, '_')
    .trim();
  return (cleaned || 'download').slice(0, MAX_FILENAME_LENGTH);
}

export function attachDownloadHandler(session: Session): void {
  session.on('will-download', (_event, item: DownloadItem) => {
    item.setSaveDialogOptions({
      defaultPath: safeDownloadFilename(item.getFilename()),
    });
  });
}
