// src/server-functions/webhooks/telegram.ts
'use server';

import TelegramBot from 'node-telegram-bot-api';
import { db } from '@/lib/firebase';
import { doc, getDoc } from '@/lib/mongoFirestoreServer';
import { processTelegramWebhookUpdate } from '@/server-functions/telegram/bot';

type TelegramWebhookSettings = {
  telegramBotToken?: string;
  telegramBotSecretToken?: string;
  telegramBotWebhookUrl?: string;
  telegramBotEnabled?: boolean;
};

const readEnvSettings = async (): Promise<TelegramWebhookSettings> => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

const resolveWebhookToken = async () => {
  const settings = await readEnvSettings();
  return settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
};

export async function verifyTelegramWebhookSecret(secretHeader: string | null): Promise<boolean> {
  const settings = await readEnvSettings();
  const expected = settings.telegramBotSecretToken || process.env.TELEGRAM_BOT_SECRET_TOKEN;
  if (!expected) return true;
  return secretHeader === expected;
}

export async function handleTelegramWebhookUpdate(update: any): Promise<{ ok: boolean }> {
  await processTelegramWebhookUpdate(update);
  return { ok: true };
}

export async function registerTelegramWebhook(overrides?: { url?: string; secretToken?: string }) {
  const settings = await readEnvSettings();
  if (settings.telegramBotEnabled === false) {
    throw new Error('Telegram бот отключен в настройках.');
  }
  const token = await resolveWebhookToken();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  const webhookUrl = overrides?.url || settings.telegramBotWebhookUrl || process.env.TELEGRAM_BOT_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('Webhook URL не задан.');
  }
  const secretToken = overrides?.secretToken || settings.telegramBotSecretToken || process.env.TELEGRAM_BOT_SECRET_TOKEN;

  const bot = new TelegramBot(token, { polling: false });
  await bot.setWebHook(webhookUrl, secretToken ? { secret_token: secretToken } : undefined);
  return { ok: true, webhookUrl };
}

export async function clearTelegramWebhook() {
  const token = await resolveWebhookToken();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  const bot = new TelegramBot(token, { polling: false });
  await bot.deleteWebHook();
  return { ok: true };
}
