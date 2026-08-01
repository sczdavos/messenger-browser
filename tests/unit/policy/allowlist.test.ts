import { describe, expect, it } from 'vitest';
import { decide } from '../../../src/main/security/policy';

describe('navigation policy', () => {
  it.each([
    'https://www.facebook.com/messages',
    'https://facebook.com/messages/t/123',
    'https://www.facebook.com/messenger_media/?attachment_id=1',
    'https://www.facebook.com/groupcall/ROOM:123/',
    'https://www.facebook.com/login.php?next=%2Fmessages',
    'https://www.facebook.com/two_factor/authentication/',
    'https://www.facebook.com/privacy/consent/',
    'https://www.messenger.com/anything',
  ])('allows %s in-app', (url) => {
    expect(decide(url).action).toBe('allow-in-app');
  });

  it.each([
    'https://www.facebook.com/marketplace',
    'https://www.facebook.com/messagesomething',
    'https://www.facebook.com/messages_evil',
    'https://facebook.com.evil.example/messages',
    'https://evil-facebook.com/messages',
    'https://example.com/article',
    'mailto:user@example.com',
    'tel:+420123456789',
  ])('routes %s externally', (url) => {
    expect(decide(url)).toEqual({ action: 'open-external' });
  });

  it.each([
    ['https://www.facebook.com@evil.example/messages', 'has-userinfo'],
    ['https://user:pass@www.facebook.com/messages', 'has-userinfo'],
    ['http://www.facebook.com/messages', 'not-https'],
    ['javascript:alert(1)', 'unsafe-scheme'],
    ['data:text/html,<p>x</p>', 'unsafe-scheme'],
    ['file:///etc/passwd', 'unsafe-scheme'],
    ['blob:https://www.facebook.com/id', 'unsafe-scheme'],
    ['about:blank', 'unsafe-scheme'],
    ['', 'malformed-url'],
    ['not a url', 'malformed-url'],
    ['//www.facebook.com/messages', 'malformed-url'],
  ])('blocks hostile input %s', (url, reason) => {
    expect(decide(url)).toEqual({ action: 'block', reason });
  });
});
