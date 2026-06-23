/**
 * Центральный конфиг брендинга Montage HUB
 * Все названия, домены и идентификаторы — в одном месте.
 * При ребрендинге менять ТОЛЬКО этот файл.
 */

export const BRAND = {
  // ─── Названия ───────────────────────────────────────────
  name: 'Montage HUB',
  nameShort: 'Montage HUB',
  nameLegal: 'Montage HUB',
  nameRu: 'Монтаж HUB',
  nameRuShort: 'Монтаж Хаб',
  tagline: 'Интеллектуальный помощник для монтажников слаботочных систем',

  // ─── Домены ─────────────────────────────────────────────
  domain: 'montagehub.ru',
  domainPro: 'montagehub.ru',
  domainAlt: 'montagehub.com',

  // ─── Субдомены ──────────────────────────────────────────
  subdomains: {
    lk: 'lk.montagehub.ru',
    admin: 'admin.montagehub.ru',
    crm: 'crm.montagehub.ru',
    partner: 'partner.montagehub.ru',
    manager: 'manager.montagehub.ru',
    mobile: 'm.montagehub.ru',
    landing: 'montagehub.ru',
    api: 'api.montagehub.ru',
  },

  // ─── Telegram ───────────────────────────────────────────
  telegram: {
    botUrl: 'https://t.me/MontageHubBot',
    botUsername: 'MontageHubBot',
    botName: 'Montage HUB Bot',
  },

  // ─── Технические идентификаторы ─────────────────────────
  ids: {
    // Docker
    dockerProject: 'montagehub',
    dockerImageWeb: 'montagehub-web',
    dockerImageWorker: 'montagehub-worker',

    // MongoDB
    mongoDb: 'montagehub',
    mongoDbLogs: 'montagehub_logs',

    // S3
    s3Bucket: 'montagehub',

    // SSH
    sshKeyName: 'montagehub_beget',

    // PWA
    pwaDbName: 'MontageHUB-PWA-DB',

    // JWT
    jwtIssuer: 'montagehub-backend',
    jwtAudience: 'montagehub-frontend',

    // WebAuthn
    rpName: 'Montage HUB',

    // GitHub
    repo: 'FamousMonsterr/AISmetchikV9',
    deployPath: '/opt/montagehub',

    // Health
    healthService: 'montagehub',
  },

  // ─── Email ──────────────────────────────────────────────
  email: {
    support: 'support@montagehub.ru',
    noreply: 'Montage HUB <noreply@montagehub.ru>',
    admin: 'admin@montagehub.ru',
    ops: 'ops@montagehub.ru',
  },

  // ─── API заголовки ──────────────────────────────────────
  api: {
    referer: 'https://montagehub.ru',
    xTitle: 'Montage HUB',
  },

  // ─── Копирайт ───────────────────────────────────────────
  copyright: `© ${new Date().getFullYear()} Montage HUB. Все права защищены.`,

  // ─── Маскот ─────────────────────────────────────────────
  mascot: {
    name: 'Масскод Монти',
    nameEn: 'Monty the Mascot',
    emoji: '🔧',
    avatarPath: '/mascot/monty.svg',
  },
} as const;

// Типы для TypeScript
export type BrandConfig = typeof BRAND;

// Удобные геттеры
export const getDomainUrl = (subdomain?: keyof typeof BRAND.subdomains) =>
  subdomain ? `https://${BRAND.subdomains[subdomain]}` : `https://${BRAND.domain}`;

export const getWebhookUrl = (bot: 'user' | 'partner' | 'manager' | 'admin') =>
  `https://${BRAND.subdomains[bot === 'user' ? 'lk' : bot]}/api/telegram/webhook/${bot}`;
