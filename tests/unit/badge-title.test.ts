import { describe, expect, it } from 'vitest';
import { parseBadgeTitle } from '../../src/main/features/badge';

describe('badge title parser', () => {
  it.each([
    ['(3) Messenger', 3],
    ['(0) Messenger', 0],
    ['(999+) Messenger', 999],
    ['(1000) Messenger', 999],
    ['(123456789) Messenger', 999],
  ])('parses %s as %s', (title, expected) => {
    expect(parseBadgeTitle(title)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    '',
    'Messenger',
    'Name píše!',
    '(abc) Messenger',
    'Messenger (3)',
    'x(3) Messenger',
    '(-1) Messenger',
    '(3.5) Messenger',
    '(3',
  ])('gracefully returns no badge for %j', (title) => {
    expect(parseBadgeTitle(title)).toBeNull();
  });
});
