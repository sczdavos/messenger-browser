import { describe, expect, it } from 'vitest';
import { evaluatePermission } from '../../../src/main/security/permissions-policy';

const facebook = 'https://www.facebook.com';

describe('permission policy', () => {
  it.each(['audio', 'video'] as const)(
    'grants %s media at Facebook',
    (mediaType) => {
      expect(
        evaluatePermission({
          permission: 'media',
          requestingOrigin: facebook,
          mediaType,
        }),
      ).toMatchObject({
        granted: true,
      });
    },
  );

  it('grants the combined request expressed by the request handler', () => {
    expect(
      evaluatePermission({
        permission: 'media',
        requestingOrigin: facebook,
        mediaTypes: ['audio', 'video'],
      }),
    ).toMatchObject({ granted: true });
  });

  it.each([undefined, 'unknown'] as const)(
    'denies invalid media type %s',
    (mediaType) => {
      const query =
        mediaType === undefined
          ? { permission: 'media', requestingOrigin: facebook }
          : { permission: 'media', requestingOrigin: facebook, mediaType };
      expect(evaluatePermission(query)).toMatchObject({ granted: false });
    },
  );

  it.each([[[]], [['unknown']], [['audio', 'unknown']]] as const)(
    'denies invalid media set %j',
    (mediaTypes) => {
      expect(
        evaluatePermission({
          permission: 'media',
          requestingOrigin: facebook,
          mediaTypes,
        }),
      ).toMatchObject({
        granted: false,
      });
    },
  );

  it.each([
    'https://evil.example',
    'https://www.messenger.com',
    'https://facebook.com.evil.example',
    'null',
    '',
  ])('denies media for unapproved origin %s', (requestingOrigin) => {
    expect(
      evaluatePermission({
        permission: 'media',
        requestingOrigin,
        mediaType: 'audio',
      }),
    ).toMatchObject({
      granted: false,
    });
  });

  it('denies unknown permissions without a code change', () => {
    expect(
      evaluatePermission({
        permission: 'future-permission-2027',
        requestingOrigin: facebook,
      }),
    ).toMatchObject({ granted: false });
  });
});
