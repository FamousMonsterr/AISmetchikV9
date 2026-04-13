const TECHNICAL_ERROR_PATTERNS: RegExp[] = [
  /openrouter api error/i,
  /request id:/i,
  /status\s*\d{3}/i,
  /\bbody:\s*\{/i,
  /no content in openrouter response/i,
  /provider returned error/i,
  /ocr этап не выполнен/i,
  /ocr stage failed/i,
  /"user_id"\s*:/i,
];

const OPENROUTER_PRIVACY_RESTRICTION_PATTERNS: RegExp[] = [
  /no endpoints available matching your guardrail restrictions and data policy/i,
  /openrouter\.ai\/settings\/privacy/i,
];

export function isOpenRouterPrivacyRestrictionError(message?: string | null): boolean {
  if (!message) return false;
  return OPENROUTER_PRIVACY_RESTRICTION_PATTERNS.some((pattern) => pattern.test(message));
}

export function isTechnicalAnalysisErrorMessage(message?: string | null): boolean {
  if (!message) return false;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function toUserFacingAnalysisError(message?: string | null): string {
  const raw = String(message || '').trim();
  if (!raw) {
    return 'Не удалось завершить анализ файла. Попробуйте повторить позже.';
  }

  const lower = raw.toLowerCase();

  if (isOpenRouterPrivacyRestrictionError(raw)) {
    return 'OpenRouter отклонил OCR из-за privacy/data policy аккаунта. Откройте OpenRouter Settings -> Privacy и разрешите endpoints для файлового OCR.';
  }

  if (lower.includes('process_cancelled') || lower.includes('задача отменена пользователем')) {
    return 'Процесс остановлен пользователем.';
  }

  if (
    lower.includes('file is too large')
    || lower.includes('max size is')
    || lower.includes('payload too large')
  ) {
    return 'Файл слишком большой для OCR-обработки. Сожмите PDF или разделите документ на части и запустите анализ повторно.';
  }

  if (
    lower.includes('status 429')
    || lower.includes('rate-limit')
    || lower.includes('temporarily rate-limited')
    || lower.includes('too many requests')
  ) {
    return 'Сервис OCR временно перегружен. Повторите попытку через несколько минут.';
  }

  if (
    lower.includes('status 402')
    || lower.includes('requires at least $0.50')
    || lower.includes('insufficient balance')
    || lower.includes('balance for files')
  ) {
    return 'Сервис OCR временно недоступен по биллингу провайдера. Повторите анализ позже.';
  }

  if (
    lower.includes('no content in openrouter response')
    || lower.includes('вернул пустой markdown')
    || lower.includes('ocr этап не выполнен')
    || lower.includes('ocr stage failed')
  ) {
    return 'Не удалось распознать текст документа. Проверьте качество PDF или попробуйте другой файл.';
  }

  if (
    lower.includes('openrouter api error')
    || lower.includes('provider returned error')
  ) {
    return 'Ошибка внешнего AI/OCR-сервиса. Повторите анализ позже.';
  }

  if (raw.length > 420 || isTechnicalAnalysisErrorMessage(raw)) {
    return 'Не удалось завершить анализ файла. Попробуйте повторить позже.';
  }

  return raw;
}

export function sanitizeAnalysisErrorForUi(message?: string | null): string {
  return toUserFacingAnalysisError(message);
}
