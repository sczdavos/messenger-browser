import { test, expect } from '@playwright/test';
import { decide } from '../../src/main/security/policy';

test.describe('authentication navigation policy', () => {
  test('keeps every observed authentication path in-app', () => {
    for (const path of [
      '/login.php?next=%2Fmessages',
      '/two_step_verification/authentication/',
      '/two_factor/authentication/',
      '/privacy/consent/',
    ]) {
      expect(decide(`https://www.facebook.com${path}`).action).toBe(
        'allow-in-app',
      );
    }
  });

  test('refuses an unallowlisted Facebook destination', () => {
    expect(decide('https://www.facebook.com/home').action).toBe(
      'open-external',
    );
  });
});
