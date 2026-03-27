import { db } from '@/lib/db';
import { doc, getDoc } from '@/lib/db-server';
import { deriveTelegramBotUsername } from '@/lib/telegram-web';

export type TelegramRuntimeConfig = {
  authToken: string;
  botUrl: string;
  botUsername: string;
  miniAppAuthEnabled: boolean;
  webAuthEnabled: boolean;
};

function pickString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

async function readEnvSettings(): Promise<Record<string, unknown>> {
  try {
    const settingsRef = doc(db, 'configs', 'envSettings');
    const snapshot = await getDoc(settingsRef);
    if (!snapshot.exists()) {
      return {};
    }
    return (snapshot.data() as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

export async function getTelegramRuntimeConfig(): Promise<TelegramRuntimeConfig> {
  const settings = await readEnvSettings();
  const authToken = pickString(
    settings.telegramBotTokenUser,
    settings.telegramBotToken,
    process.env.TELEGRAM_BOT_TOKEN_USER,
    process.env.TELEGRAM_BOT_TOKEN,
  );
  const botUrl = pickString(
    settings.nextPublicTelegramBotUrl,
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL,
  );
  const botUsername = pickString(
    settings.nextPublicTelegramBotUsername,
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    deriveTelegramBotUsername(botUrl),
  );

  return {
    authToken,
    botUrl,
    botUsername,
    miniAppAuthEnabled: Boolean(authToken),
    webAuthEnabled: Boolean(authToken && botUsername),
  };
}
