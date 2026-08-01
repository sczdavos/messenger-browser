import { describe, expect, it } from 'vitest';
import { safeDownloadFilename } from '../../src/main/features/downloads';

describe('download filename sanitization', () => {
  it.each([
    ['photo.jpg', 'photo.jpg'],
    ['../../secret.txt', 'secret.txt'],
    ['..\\..\\secret.txt', 'secret.txt'],
    ['unsafe\u0000name.pdf', 'unsafename.pdf'],
    ['', 'download'],
    [null, 'download'],
  ])('sanitizes %j to %j', (input, expected) => {
    expect(safeDownloadFilename(input)).toBe(expected);
  });

  it('caps excessive filenames', () => {
    expect(safeDownloadFilename('a'.repeat(400))).toHaveLength(255);
  });
});
