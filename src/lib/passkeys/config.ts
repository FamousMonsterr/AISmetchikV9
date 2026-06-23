import type { PasskeyRelyingPartyConfig } from '@/types/passkey';

const DEFAULT_RP_NAME = 'Montage HUB';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_CHALLENGE_TTL_MS = 5 * 60_000;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function getEnvNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getOriginFromUrl(url: string) {
  return normalizeOrigin(new URL(url).origin);
}

export function resolvePasskeyOrigin(requestOrigin?: string | null): string {
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : '';
  const configuredOrigin = process.env.PASSKEY_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) {
    const normalizedConfiguredOrigin = normalizeOrigin(configuredOrigin);
    if (normalizedRequestOrigin && normalizedConfiguredOrigin !== normalizedRequestOrigin) {
      throw new Error(
        `PASSKEY_ORIGIN mismatch: expected ${normalizedConfiguredOrigin}, received ${normalizedRequestOrigin}. ` +
        'PASSKEY_ORIGIN должен совпадать с origin страницы, где открыт passkey.',
      );
    }
    return normalizedConfiguredOrigin;
  }
  if (normalizedRequestOrigin) {
    return normalizedRequestOrigin;
  }
  throw new Error('Passkey origin is not configured. Set PASSKEY_ORIGIN or NEXT_PUBLIC_SITE_URL.');
}

export function resolvePasskeyRpId(origin: string): string {
  if (process.env.PASSKEY_RP_ID) {
    return process.env.PASSKEY_RP_ID.trim();
  }
  return new URL(origin).hostname;
}

export function resolvePasskeyConfig(requestOrigin?: string | null): PasskeyRelyingPartyConfig {
  const origin = resolvePasskeyOrigin(requestOrigin);
  const rpId = resolvePasskeyRpId(origin);
  return {
    rpId,
    rpName: process.env.PASSKEY_RP_NAME || DEFAULT_RP_NAME,
    origin,
    timeoutMs: getEnvNumber(process.env.PASSKEY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    challengeTtlMs: getEnvNumber(process.env.PASSKEY_CHALLENGE_TTL_MS, DEFAULT_CHALLENGE_TTL_MS),
    userVerification: (process.env.PASSKEY_USER_VERIFICATION as PasskeyRelyingPartyConfig['userVerification']) || 'preferred',
    attestation: (process.env.PASSKEY_ATTESTATION as PasskeyRelyingPartyConfig['attestation']) || 'none',
  };
}

export function getPublicOriginFromRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  if (forwardedProto && host) {
    return normalizeOrigin(`${forwardedProto}://${host}`);
  }
  return normalizeOrigin(new URL(request.url).origin);
}
