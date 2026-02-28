// src/server-functions/webhooks/telegram.ts

import TelegramBot from 'node-telegram-bot-api';
import { db } from '@/lib/firebase';
import { doc, getDoc } from '@/lib/mongoFirestoreServer';
import { processTelegramWebhookUpdate } from '@/server-functions/telegram/bot';

export const TELEGRAM_AUDIENCES = ['default', 'user', 'partner', 'manager', 'admin'] as const;
export type TelegramAudience = (typeof TELEGRAM_AUDIENCES)[number];

type TelegramWebhookSettings = {
  telegramBotToken?: string;
  telegramBotSecretToken?: string;
  telegramBotWebhookUrl?: string;
  telegramBotEnabled?: boolean;
  telegramBotTokenUser?: string;
  telegramBotSecretTokenUser?: string;
  telegramBotWebhookUrlUser?: string;
  telegramBotEnabledUser?: boolean;
  telegramBotTokenPartner?: string;
  telegramBotSecretTokenPartner?: string;
  telegramBotWebhookUrlPartner?: string;
  telegramBotEnabledPartner?: boolean;
  telegramBotTokenManager?: string;
  telegramBotSecretTokenManager?: string;
  telegramBotWebhookUrlManager?: string;
  telegramBotEnabledManager?: boolean;
  telegramBotTokenAdmin?: string;
  telegramBotSecretTokenAdmin?: string;
  telegramBotWebhookUrlAdmin?: string;
  telegramBotEnabledAdmin?: boolean;
  [key: string]: any;
};

const readEnvSettings = async (): Promise<TelegramWebhookSettings> => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

function normalizeAudience(audience?: string): TelegramAudience {
  if (!audience) return 'default';
  return (TELEGRAM_AUDIENCES as readonly string[]).includes(audience) ? (audience as TelegramAudience) : 'default';
}

function suffixFor(audience: TelegramAudience) {
  return audience === 'default' ? '' : audience[0].toUpperCase() + audience.slice(1);
}

async function resolveAudienceConfig(audience?: TelegramAudience) {
  const resolvedAudience = normalizeAudience(audience);
  const settings = await readEnvSettings();
  const suffix = suffixFor(resolvedAudience);
  const envSuffix = resolvedAudience.toUpperCase();

  const token =
    settings[`telegramBotToken${suffix}`] ||
    process.env[`TELEGRAM_BOT_TOKEN_${envSuffix}`] ||
    settings.telegramBotToken ||
    process.env.TELEGRAM_BOT_TOKEN;

  const secret =
    settings[`telegramBotSecretToken${suffix}`] ||
    process.env[`TELEGRAM_BOT_SECRET_TOKEN_${envSuffix}`] ||
    settings.telegramBotSecretToken ||
    process.env.TELEGRAM_BOT_SECRET_TOKEN;

  const webhookUrl =
    settings[`telegramBotWebhookUrl${suffix}`] ||
    process.env[`TELEGRAM_BOT_WEBHOOK_URL_${envSuffix}`] ||
    settings.telegramBotWebhookUrl ||
    process.env.TELEGRAM_BOT_WEBHOOK_URL;

  const enabledScoped = settings[`telegramBotEnabled${suffix}`];
  const enabled = enabledScoped == null ? settings.telegramBotEnabled !== false : enabledScoped !== false;

  return {
    audience: resolvedAudience,
    token,
    secret,
    webhookUrl,
    enabled,
  };
}

export async function verifyTelegramWebhookSecret(secretHeader: string | null, audience?: TelegramAudience): Promise<boolean> {
  const config = await resolveAudienceConfig(audience);
  if (!config.secret) return true;
  return secretHeader === config.secret;
}

export async function handleTelegramWebhookUpdate(
  update: any,
  audience?: TelegramAudience
): Promise<{ ok: boolean; audience: TelegramAudience }> {
  const config = await resolveAudienceConfig(audience);
  if (!config.token) {
    throw new Error(`TELEGRAM_BOT_TOKEN не задан для аудитории ${config.audience}.`);
  }
  await processTelegramWebhookUpdate(update, { token: config.token });
  return { ok: true, audience: config.audience };
}

export async function registerTelegramWebhook(
  overrides?: { url?: string; secretToken?: string; audience?: TelegramAudience }
) {
  const config = await resolveAudienceConfig(overrides?.audience);
  if (!config.enabled) {
    throw new Error('Telegram бот отключен в настройках.');
  }
  if (!config.token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  const webhookUrl = overrides?.url || config.webhookUrl;
  if (!webhookUrl) {
    throw new Error('Webhook URL не задан.');
  }
  const secretToken = overrides?.secretToken || config.secret;

  const bot = new TelegramBot(config.token, { polling: false });
  await bot.setWebHook(webhookUrl, secretToken ? { secret_token: secretToken } : undefined);
  return { ok: true, webhookUrl, audience: config.audience };
}

export async function clearTelegramWebhook(audience?: TelegramAudience) {
  const config = await resolveAudienceConfig(audience);
  if (!config.token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  const bot = new TelegramBot(config.token, { polling: false });
  await bot.deleteWebHook();
  return { ok: true, audience: config.audience };
}
