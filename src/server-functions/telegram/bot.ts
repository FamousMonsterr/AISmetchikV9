// src/server-functions/telegram/bot.ts
// Polling/webhook bot handler for Telegram commands, callbacks, and chat binding.

import TelegramBot, { type Message } from 'node-telegram-bot-api';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, limit, getDocs } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';

const readEnvSettings = async () => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

type StartPayload = {
  raw?: string | null;
  refUserId?: string | null;
};

const parseStartPayload = (msg: Message): StartPayload => {
  const text = msg.text || '';
  const parts = text.trim().split(/\s+/);
  const payload = parts.length > 1 ? parts.slice(1).join(' ') : null;
  if (!payload) return { raw: null, refUserId: null };
  const refMatch = payload.match(/^(ref_|uid_)(.+)$/i);
  return {
    raw: payload,
    refUserId: refMatch ? refMatch[2] : null,
  };
};

const resolveWebAppUrl = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_TELEGRAM_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined) ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  return envUrl || 'https://example.com';
};

const findUserByChatId = async (chatId: number) => {
  const q = query(collection(db, 'users'), where('telegramChatId', '==', chatId), limit(1));
  const snap = await getDocs(q as any);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as any) };
};

const webhookBots = new Map<string, TelegramBot>();

const ensureBotToken = async () => {
  const envSettings = await readEnvSettings();
  const token = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  return token;
};

const registerHandlers = (bot: TelegramBot) => {
  const webAppUrl = resolveWebAppUrl();

  const saveChat = async (msg: Message, payload: StartPayload) => {
    const chatId = msg.chat.id;
    const userId = payload.refUserId || null;
    const isPremium = Boolean((msg.from as any)?.is_premium);
    const chatRef = doc(db, 'telegram_chats', String(chatId));
    const existing = await getDoc(chatRef);
    const base = {
      chatId,
      username: msg.from?.username || null,
      firstName: msg.from?.first_name || null,
      lastName: msg.from?.last_name || null,
      languageCode: msg.from?.language_code || null,
      isPremium,
      startPayload: payload.raw || null,
      refUserId: userId,
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await setDoc(chatRef, base, { merge: true });
    } else {
      await setDoc(chatRef, { ...base, createdAt: serverTimestamp() });
    }

    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        telegramChatId: chatId,
        telegramUsername: msg.from?.username || '',
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Failed to update user with telegram chat', { userId, chatId, err: err?.message });
      });
    }
  };

  const sendWelcome = async (chatId: number) => {
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Открыть приложение', web_app: { url: webAppUrl } }],
        [{ text: 'Помощь', callback_data: 'help' }],
      ],
    };
    await bot.sendMessage(
      chatId,
      'Привет! Я бот AI Сметчик. Жми кнопку, чтобы открыть приложение, или команду /help.',
      { reply_markup: keyboard }
    );
  };

  const sendProfile = async (chatId: number) => {
    const user = await findUserByChatId(chatId);
    if (!user) {
      await bot.sendMessage(chatId, 'Не найден аккаунт. Откройте приложение через /start для привязки.');
      return;
    }
    const credits = user.credits ?? 0;
    const plan = user.plan ?? 'Free';
    const username = user.telegramUsername || user.displayName || 'Пользователь';
    await bot.sendMessage(
      chatId,
      `Профиль: ${username}\nПлан: ${plan}\nКредиты: ${credits}\n\nОткройте приложение, чтобы пополнить или управлять тарифом.`,
      { reply_markup: { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: webAppUrl } }]] } }
    );
  };

  const sendHistory = async (chatId: number) => {
    const user = await findUserByChatId(chatId);
    if (!user) {
      await bot.sendMessage(chatId, 'История недоступна. Откройте приложение через /start для привязки.');
      return;
    }
    await bot.sendMessage(
      chatId,
      'История доступна в приложении (Раздел Проекты). Нажмите, чтобы открыть.',
      { reply_markup: { inline_keyboard: [[{ text: 'Открыть проекты', web_app: { url: webAppUrl } }]] } }
    );
  };

  const sendNew = async (chatId: number) => {
    await bot.sendMessage(
      chatId,
      'Создание нового расчёта доступно в приложении. Откройте калькулятор и загрузите файл.',
      { reply_markup: { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: webAppUrl } }]] } }
    );
  };

  const sendHelp = async (chatId: number) => {
    await bot.sendMessage(
      chatId,
      'Доступные команды:\n/start — запуск бота и привязка\n/profile — профиль и баланс\n/new — начать новый расчёт\n/history — история запросов\n/help — помощь\n/pay — оплата и тарифы\n/ping — проверка связи',
    );
  };

  const sendPay = async (chatId: number) => {
    await bot.sendMessage(
      chatId,
      'Оплата и тарифы доступны в приложении (Профиль → Тариф). Можно оплатить по карте или счету от юрлица. Укажите реквизиты в профиле для счета.',
      { reply_markup: { inline_keyboard: [[{ text: 'Открыть тарифы', web_app: { url: webAppUrl } }]] } }
    );
  };

  const sendPing = async (chatId: number) => {
    await bot.sendMessage(chatId, `pong ✅ ${new Date().toLocaleString()}`);
  };

  bot.onText(/\/start.*/i, async (msg) => {
    const payload = parseStartPayload(msg);
    try {
      await saveChat(msg, payload);
    } catch (err: any) {
      console.error('Failed to save chat_id', err?.message || err);
    }
    await sendWelcome(msg.chat.id);
  });

  bot.onText(/\/help/i, async (msg) => {
    await sendHelp(msg.chat.id);
  });

  bot.onText(/\/profile/i, async (msg) => {
    await sendProfile(msg.chat.id);
  });

  bot.onText(/\/new/i, async (msg) => {
    await sendNew(msg.chat.id);
  });

  bot.onText(/\/history/i, async (msg) => {
    await sendHistory(msg.chat.id);
  });

  bot.onText(/\/pay/i, async (msg) => {
    await sendPay(msg.chat.id);
  });

  bot.onText(/\/ping/i, async (msg) => {
    await sendPing(msg.chat.id);
  });

  bot.on('callback_query', async (q) => {
    if (!q.data) return;
    try {
      if (q.data === 'help') {
        await bot.answerCallbackQuery(q.id, { text: 'Справка отправлена в чат' });
        await bot.sendMessage(
          q.message!.chat.id,
          'Команды:\n/start — меню и запуск приложения\n/profile — профиль\n/new — новый расчёт\n/history — история\n/help — эта справка\n/pay — оплата\n/ping — проверка связи'
        );
        return;
      }
      await bot.answerCallbackQuery(q.id, { text: 'Команда не распознана' });
    } catch (err: any) {
      console.error('Callback error', err?.message || err);
    }
  });

  bot.on('polling_error', (err: any) => {
    const description = err?.response?.body?.description || err?.message || 'Polling error';
    console.error('Telegram polling error:', description);
  });
};

export async function startTelegramBot(polling = true) {
  const token = await ensureBotToken();
  const bot = new TelegramBot(token, { polling });
  registerHandlers(bot);
  return bot;
}

const getWebhookBot = async (token?: string) => {
  const resolvedToken = token || (await ensureBotToken());
  const cached = webhookBots.get(resolvedToken);
  if (cached) {
    return cached;
  }
  const bot = new TelegramBot(resolvedToken, { polling: false });
  registerHandlers(bot);
  webhookBots.set(resolvedToken, bot);
  return bot;
};

export async function processTelegramWebhookUpdate(update: any, options?: { token?: string }) {
  const bot = await getWebhookBot(options?.token);
  bot.processUpdate(update);
}
