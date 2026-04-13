// src/server-functions/notifications/telegram.ts
'use server';

import TelegramBot from '@/lib/telegram/telegraf-compat';
import { db } from '@/lib/db';
import { doc, getDoc, serverTimestamp, setDoc } from '@/lib/db-server';
import { getEnvSettings } from '@/actions/adminActions';

export type TelegramDispatchInput = {
  userId?: string;
  chatId?: number;
  message: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disableWebPagePreview?: boolean;
  idempotencyKey?: string;
  cooldownSeconds?: number;
  metadata?: Record<string, any>;
};

export type TelegramDispatchResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  chatId?: number | null;
  messageId?: number | null;
};

let sendBot: TelegramBot | null = null;
let sendBotToken: string | null = null;

const getSendBot = async () => {
  const env = await getEnvSettings({ allowInternal: true });
  const token =
    env.telegramBotTokenUser ||
    env.telegramBotToken ||
    process.env.TELEGRAM_BOT_TOKEN_USER ||
    process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  if (sendBot && sendBotToken === token) {
    return sendBot;
  }
  sendBot = new TelegramBot(token, { polling: false });
  sendBotToken = token;
  return sendBot;
};

const resolveChatId = async (input: TelegramDispatchInput): Promise<number | null> => {
  if (input.chatId) return input.chatId;
  if (!input.userId) return null;
  const userRef = doc(db, 'users', input.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;
  const chatId = (userSnap.data() as any).telegramChatId;
  return typeof chatId === 'number' ? chatId : null;
};

const checkCooldown = async (key: string, cooldownSeconds: number) => {
  const limitRef = doc(db, 'telegram_rate_limits', key);
  const limitSnap = await getDoc(limitRef);
  if (!limitSnap.exists()) return false;
  const lastSentAt = limitSnap.data()?.lastSentAt;
  const lastDate = lastSentAt?.toDate ? lastSentAt.toDate() : lastSentAt ? new Date(lastSentAt) : null;
  if (!lastDate) return false;
  return Date.now() - lastDate.getTime() < cooldownSeconds * 1000;
};

const saveCooldown = async (key: string) => {
  const limitRef = doc(db, 'telegram_rate_limits', key);
  await setDoc(limitRef, { lastSentAt: serverTimestamp() }, { merge: true });
};

const checkIdempotency = async (idempotencyKey: string) => {
  const dispatchRef = doc(db, 'notification_dispatches', idempotencyKey);
  const dispatchSnap = await getDoc(dispatchRef);
  if (!dispatchSnap.exists()) return null;
  return dispatchSnap.data();
};

const writeDispatchLog = async (idempotencyKey: string, payload: Record<string, any>) => {
  const dispatchRef = doc(db, 'notification_dispatches', idempotencyKey);
  await setDoc(dispatchRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
};

export async function sendTelegramMessage(input: TelegramDispatchInput): Promise<TelegramDispatchResult> {
  if (!input.message?.trim()) {
    return { success: false, skipped: true, reason: 'empty_message' };
  }

  const chatId = await resolveChatId(input);
  if (!chatId) {
    return { success: false, skipped: true, reason: 'missing_chat_id' };
  }

  if (input.idempotencyKey) {
    const existing = await checkIdempotency(input.idempotencyKey);
    if (existing?.status === 'sent') {
      return { success: true, skipped: true, reason: 'idempotent', chatId, messageId: existing?.messageId || null };
    }
  }

  const cooldownSeconds = input.cooldownSeconds ?? 2;
  const rateKey = input.userId ? `user:${input.userId}` : `chat:${chatId}`;
  if (cooldownSeconds > 0 && rateKey) {
    const limited = await checkCooldown(rateKey, cooldownSeconds);
    if (limited) {
      if (input.idempotencyKey) {
        await writeDispatchLog(input.idempotencyKey, {
          channel: 'telegram',
          status: 'skipped',
          reason: 'rate_limited',
          userId: input.userId || null,
          chatId,
        });
      }
      return { success: false, skipped: true, reason: 'rate_limited', chatId };
    }
  }

  try {
    const bot = await getSendBot();
    const response = await bot.sendMessage(chatId, input.message, {
      parse_mode: input.parseMode,
      disable_web_page_preview: input.disableWebPagePreview ?? true,
    });
    if (rateKey) {
      await saveCooldown(rateKey);
    }
    if (input.idempotencyKey) {
      await writeDispatchLog(input.idempotencyKey, {
        channel: 'telegram',
        status: 'sent',
        userId: input.userId || null,
        chatId,
        messageId: response?.message_id || null,
        metadata: input.metadata || null,
        createdAt: serverTimestamp(),
      });
    }
    return { success: true, chatId, messageId: response?.message_id || null };
  } catch (error: any) {
    if (input.idempotencyKey) {
      await writeDispatchLog(input.idempotencyKey, {
        channel: 'telegram',
        status: 'failed',
        userId: input.userId || null,
        chatId,
        error: error?.message || String(error),
        metadata: input.metadata || null,
        createdAt: serverTimestamp(),
      });
    }
    return { success: false, reason: error?.message || 'send_failed', chatId };
  }
}
