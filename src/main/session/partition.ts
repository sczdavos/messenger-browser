import { session } from 'electron';

export const MESSENGER_PARTITION = 'persist:messenger';

export function messengerSession(): Electron.Session {
  return session.fromPartition(MESSENGER_PARTITION);
}
