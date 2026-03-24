import { createHash, createHmac, timingSafeEqual } from 'crypto';

export type TelegramWebAuthPayload = {
  id: string | number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string | number;
  hash: string;
};

export function deriveTelegramBotUsername(botUrl?: string | null): string {
  const value = typeof botUrl === 'string' ? botUrl.trim() : '';
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    const pathname = parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!pathname) {
      return '';
    }
    return pathname.split('/')[0] || '';
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^@/, '').split('/')[0] || '';
  }
}

export function normalizeTelegramWebPayload(payload: Record<string, unknown>): TelegramWebAuthPayload {
  return {
    id: String(payload.id ?? ''),
    first_name: String(payload.first_name ?? ''),
    last_name: typeof payload.last_name === 'string' ? payload.last_name : '',
    username: typeof payload.username === 'string' ? payload.username : '',
    photo_url: typeof payload.photo_url === 'string' ? payload.photo_url : '',
    auth_date: String(payload.auth_date ?? ''),
    hash: String(payload.hash ?? ''),
  };
}

export function validateTelegramWebPayload(
  payload: Record<string, unknown>,
  botToken: string,
  maxAgeSeconds = 3600,
): TelegramWebAuthPayload {
  const normalized = normalizeTelegramWebPayload(payload);
  if (!normalized.id || !normalized.first_name || !normalized.auth_date || !normalized.hash) {
    throw new Error('Telegram web auth payload is incomplete.');
  }

  const authDate = Number(normalized.auth_date);
  if (!Number.isFinite(authDate)) {
    throw new Error('Telegram auth_date is invalid.');
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > maxAgeSeconds) {
    throw new Error('Telegram web auth payload expired.');
  }

  const dataCheckString = Object.entries(normalized)
    .filter(([key, value]) => key !== 'hash' && value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const actual = Buffer.from(normalized.hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Telegram web auth payload signature is invalid.');
  }

  return normalized;
}
