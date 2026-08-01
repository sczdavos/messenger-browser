import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openExternal } = vi.hoisted(() => ({
  openExternal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('electron', () => ({
  shell: { openExternal },
}));

import { openExternalUrl } from '../../src/main/security/external-open';

describe('external browser handoff', () => {
  beforeEach(() => openExternal.mockClear());

  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/file'])(
    'does not hand unsafe scheme %s to the OS',
    async (url) => {
      await expect(openExternalUrl(url)).resolves.toBe(false);
      expect(openExternal).not.toHaveBeenCalled();
    },
  );

  it('hands safe external URLs to the system browser', async () => {
    await expect(openExternalUrl('https://example.com/article')).resolves.toBe(
      true,
    );
    expect(openExternal).toHaveBeenCalledWith('https://example.com/article');
  });
});
