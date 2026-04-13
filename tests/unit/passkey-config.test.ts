import { afterEach, describe, expect, it } from 'vitest';
import { resolvePasskeyOrigin, resolvePasskeyRpId } from '@/lib/passkeys/config';

const originalPasskeyOrigin = process.env.PASSKEY_ORIGIN;
const originalPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalPasskeyRpId = process.env.PASSKEY_RP_ID;

afterEach(() => {
  if (originalPasskeyOrigin === undefined) {
    delete process.env.PASSKEY_ORIGIN;
  } else {
    process.env.PASSKEY_ORIGIN = originalPasskeyOrigin;
  }

  if (originalPublicSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalPublicSiteUrl;
  }

  if (originalPasskeyRpId === undefined) {
    delete process.env.PASSKEY_RP_ID;
  } else {
    process.env.PASSKEY_RP_ID = originalPasskeyRpId;
  }
});

describe('passkey config', () => {
  it('rejects mismatched request origin when PASSKEY_ORIGIN is configured', () => {
    process.env.PASSKEY_ORIGIN = 'https://lk.aismetchik.ru';

    expect(() => resolvePasskeyOrigin('https://aismetchik.ru')).toThrow(/PASSKEY_ORIGIN mismatch/);
  });

  it('uses request origin when explicit config is absent', () => {
    delete process.env.PASSKEY_ORIGIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(resolvePasskeyOrigin('https://lk.aismetchik.ru')).toBe('https://lk.aismetchik.ru');
  });

  it('prefers explicit RP ID when configured', () => {
    process.env.PASSKEY_RP_ID = 'aismetchik.ru';

    expect(resolvePasskeyRpId('https://lk.aismetchik.ru')).toBe('aismetchik.ru');
  });
});
