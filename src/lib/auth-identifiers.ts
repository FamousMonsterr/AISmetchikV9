export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isLikelyEmail(value: unknown): boolean {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.includes('@');
}

export function normalizePhone(phone: unknown): string {
  if (typeof phone !== 'string') {
    return '';
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  // Common RU fallback: `8XXXXXXXXXX` -> `+7XXXXXXXXXX`
  if (!hasPlus && digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (hasPlus || digits.startsWith('7') || digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return `+${digits}`;
}

export function resolveIdentifier(input: unknown): { type: 'email' | 'phone' | 'unknown'; value: string } {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) {
    return { type: 'unknown', value: '' };
  }

  if (isLikelyEmail(raw)) {
    return { type: 'email', value: normalizeEmail(raw) };
  }

  const normalizedPhone = normalizePhone(raw);
  if (normalizedPhone) {
    return { type: 'phone', value: normalizedPhone };
  }

  return { type: 'unknown', value: raw };
}
