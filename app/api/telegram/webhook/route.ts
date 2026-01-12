import { NextRequest, NextResponse } from 'next/server';
import { getEnvSettings } from '@/actions/adminActions';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';

type TelegramUpdate = {
  update_id?: number;
  message?: any;
  edited_message?: any;
  callback_query?: any;
};

const TELEGRAM_API = 'https://api.telegram.org';

const sendTelegramRequest = async (token: string, method: string, payload: Record<string, any>) => {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Telegram API error for ${method}`);
  }
  return res.json();
};

const parseStartPayload = (text: string) => {
  const parts = text.split(' ');
  if (parts.length < 2) return null;
  return parts.slice(1).join(' ').trim();
};

const buildWelcomeMessage = (appUrl?: string) => {
  const text = [
    'Добро пожаловать в AI Сметчик.',
    '',
    'Что умеет бот:',
    '• присылать документы и получать результаты анализа',
    '• отправлять счета и КП в Telegram',
    '• принимать обратную связь через /feedback',
    '',
    'Для привязки аккаунта откройте приложение через WebApp и выполните вход.',
  ].join('\n');

  if (!appUrl) {
    return { text };
  }

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Открыть приложение',
            web_app: { url: appUrl },
          },
        ],
      ],
    },
  };
};

export async function POST(request: NextRequest) {
  try {
    const envSettings = await getEnvSettings();
    const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'Missing Telegram bot token' }, { status: 500 });
    }

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message || update.edited_message || update.callback_query?.message;
    const from = update.message?.from || update.edited_message?.from || update.callback_query?.from;
    const chat = update.message?.chat || update.edited_message?.chat || update.callback_query?.message?.chat;
    const text: string | undefined = update.message?.text || update.edited_message?.text || update.callback_query?.data;

    const chatId = chat?.id;
    const username = from?.username || '';

    if (chatId) {
      await addDoc(collection(db, 'telegram_updates'), {
        updateId: update.update_id ?? null,
        chatId,
        username,
        text: text || '',
        payload: update,
        createdAt: serverTimestamp(),
      });
    }

    if (chatId && username) {
      const usersQuery = query(collection(db, 'users'), where('telegramChatId', '==', chatId));
      const userSnap = await getDocs(usersQuery);
      if (!userSnap.empty) {
        const userId = userSnap.docs[0].id;
        await updateDoc(doc(db, 'users', userId), {
          telegramUsername: username,
          lastTelegramActivityAt: serverTimestamp(),
        });
      }
    }

    if (chatId && text) {
      const trimmed = text.trim();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';

      if (trimmed.startsWith('/start')) {
        const payload = parseStartPayload(trimmed);
        if (payload?.startsWith('ref_')) {
          const referrerId = payload.replace('ref_', '').trim();
          if (referrerId) {
            await addDoc(collection(db, 'telegram_referrals'), {
              referrerUserId: referrerId,
              chatId,
              username,
              createdAt: serverTimestamp(),
            });
          }
        }
        const welcome = buildWelcomeMessage(appUrl || undefined);
        await sendTelegramRequest(botToken, 'sendMessage', {
          chat_id: chatId,
          ...welcome,
        });
      } else if (trimmed.startsWith('/feedback')) {
        const feedbackText = trimmed.replace('/feedback', '').trim();
        if (feedbackText.length > 0) {
          await addDoc(collection(db, 'telegram_feedback'), {
            chatId,
            username,
            message: feedbackText,
            createdAt: serverTimestamp(),
          });
          await sendTelegramRequest(botToken, 'sendMessage', {
            chat_id: chatId,
            text: 'Спасибо за обратную связь! Мы получили ваше сообщение.',
          });
        } else {
          await sendTelegramRequest(botToken, 'sendMessage', {
            chat_id: chatId,
            text: 'Напишите отзыв после команды: /feedback Ваш текст',
          });
        }
      } else if (trimmed.startsWith('/help')) {
        await sendTelegramRequest(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Команды: /start, /feedback, /help. Для привязки аккаунта откройте приложение через WebApp.',
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Webhook error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
