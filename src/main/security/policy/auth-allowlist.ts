import type { AllowlistRule } from './types';

export const AUTH_ALLOWLIST: readonly AllowlistRule[] = Object.freeze([
  Object.freeze({
    host: 'facebook.com',
    paths: [
      '/login.php',
      '/two_step_verification',
      '/two_factor',
      '/privacy/consent',
    ],
    kind: 'authentication',
  }),
]);
