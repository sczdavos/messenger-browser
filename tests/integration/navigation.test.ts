import { test, expect } from '@playwright/test';
import { decide } from '../../src/main/security/policy';

test.describe('navigation routing policy', () => {
  test('routes non-Messenger destinations and link shims externally', () => {
    for (const url of [
      'https://www.facebook.com/home',
      'https://www.facebook.com/marketplace',
      'https://www.facebook.com/watch',
      'https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com',
      'https://lm.facebook.com/l.php?u=https%3A%2F%2Fexample.com',
      'https://example.com/article',
    ]) {
      expect(decide(url).action).toBe('open-external');
    }
  });

  test('keeps Messenger surfaces in-app', () => {
    for (const url of [
      'https://www.facebook.com/messages',
      'https://www.facebook.com/messages/t/123',
      'https://www.facebook.com/messenger_media/?attachment_id=1',
      'https://www.messenger.com/anything',
    ]) {
      expect(decide(url).action).toBe('allow-in-app');
    }
  });

  test('evaluates every redirect hop independently', () => {
    expect(
      decide('https://www.facebook.com/login.php?next=%2Fmessages').action,
    ).toBe('allow-in-app');
    expect(decide('https://example.com/article').action).toBe('open-external');
    expect(decide('javascript:alert(1)').action).toBe('block');
  });

  test('does not route subresources through the external browser', () => {
    // Subresources are excluded before decide() by the mainFrame-only
    // webRequest filter and the matching runtime guard.
    expect(decide('https://static.xx.fbcdn.net/assets/app.js').action).toBe(
      'open-external',
    );
    expect(decide('https://www.facebook.net/assets/app.js').action).toBe(
      'open-external',
    );
  });
});
