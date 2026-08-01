import type { AllowlistRule } from './types';

export const NAVIGATION_ALLOWLIST: readonly AllowlistRule[] = Object.freeze([
  Object.freeze({
    host: 'facebook.com',
    paths: ['/messages', '/messenger_media'],
    kind: 'messenger',
  }),
  Object.freeze({ host: 'messenger.com', paths: 'any', kind: 'messenger' }),
]);
