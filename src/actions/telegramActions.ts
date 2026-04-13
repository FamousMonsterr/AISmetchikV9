// src/actions/telegramActions.ts
// @ts-nocheck
'use server';

import { z } from 'zod';
import TelegramBot from '@/lib/telegram/telegraf-compat';
import { doc, updateDoc, getDoc, collection, query, where, orderBy, limit, getDocs } from '@/lib/db-server';
import { db } from '@/lib/db';
import { parse, validate } from '@tma.js/init-data-node';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateTelegramWebPayload } from '@/lib/telegram-web';
import { getTelegramRuntimeConfig } from '@/lib/telegram/runtime';
import { getDb } from '@/lib/mongodb';

const LinkAccountSchema = z.object({
  initData: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.union([z.string(), z.number()]).optional(),
  hash: z.string().optional(),
});

export async function linkTelegramAccount(data: z.infer<typeof LinkAccountSchema>): Promise<{ success: boolean; message: string; telegramUser?: any; }> {
  const validation = LinkAccountSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для привязки.' };
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Требуется аутентификация.' };
  }

  const { initData } = validation.data;
  const runtime = await getTelegramRuntimeConfig();
  const botToken = runtime.authToken;

  if (!botToken) {
    return { success: false, message: 'Сервер не настроен для работы с Telegram.' };
  }

  try {
    const telegramUser = initData
      ? (() => {
          validate(initData, botToken, { expiresIn: 3600 });
          const validatedData = parse(initData);
          if (!validatedData.user) {
            throw new Error("Не удалось получить данные пользователя из Telegram.");
          }
          return validatedData.user;
        })()
      : validateTelegramWebPayload(validation.data as any, botToken, 3600);

    const { id: telegramChatId, username: telegramUsername } = telegramUser as any;
    const normalizedChatId = Number(telegramChatId);
    if (!Number.isFinite(normalizedChatId) || normalizedChatId <= 0) {
      return { success: false, message: 'Telegram вернул некорректный chat id.' };
    }
    const mongo = await getDb();
    const linkedUser = await mongo.collection<any>('users').findOne({
      telegramChatId: normalizedChatId,
      _id: { $ne: userId },
    });
    if (linkedUser) {
      return { success: false, message: 'Этот Telegram аккаунт уже привязан к другому пользователю.' };
    }
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        telegramChatId: normalizedChatId,
        telegramUsername: telegramUsername || '',
        telegramLinkedAt: new Date(),
        updatedAt: new Date(),
    });

    return { success: true, message: 'Аккаунт Telegram успешно привязан.', telegramUser };

  } catch (error: any) {
    console.error("Ошибка привязки аккаунта Telegram:", error);
    return { success: false, message: error.message || 'Ошибка валидации данных Telegram.' };
  }
}

export async function unlinkTelegramAccount(): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Требуется аутентификация.' };
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      telegramChatId: null,
      telegramUsername: '',
      telegramLinkedAt: null,
      updatedAt: new Date(),
    });
    return { success: true, message: 'Связь с Telegram удалена.' };
  } catch (error: any) {
    console.error("Ошибка отвязки аккаунта Telegram:", error);
    return { success: false, message: error.message || 'Не удалось отвязать Telegram.' };
  }
}


const SendFileSchema = z.object({
  chatId: z.number().optional(), // kept for backward compatibility, ignored
  fileData: z.string(), // base64 encoded string
  fileName: z.string(),
  fileMime: z.string().optional(),
  caption: z.string().optional(),
});

export async function sendFileToTelegramUser(data: z.infer<typeof SendFileSchema>): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: "Требуется аутентификация." };
  }

  const runtime = await getTelegramRuntimeConfig();
  const botToken = runtime.authToken;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    return { success: false, message: "Сервер не настроен для отправки файлов." };
  }

  const validation = SendFileSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: "Неверные данные для отправки файла." };
  }
  
  const { fileData, fileName, fileMime, caption } = validation.data;

  const userDoc = await getDoc(doc(db, 'users', userId));
  const chatId = userDoc.data()?.telegramChatId;
  if (!chatId) {
    return { success: false, message: "Не найден chat_id. Привяжите Telegram-бота в профиле." };
  }

  try {
    const bot = new TelegramBot(botToken);
    
    // CRITICAL: Convert base64 to Buffer before sending.
    // The base64 string from FileReader includes a prefix like "data:application/...;base64,"
    // which needs to be removed.
    const hasPrefix = fileData.includes(',');
    const base64Data = hasPrefix ? fileData.split(',')[1] : fileData;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const detectedMime = hasPrefix
      ? fileData.split(',')[0]?.replace(/^data:/, '').replace(/;base64$/, '')
      : undefined;
    const normalizedMime = fileMime || detectedMime || (fileName.endsWith('.pdf') ? 'application/pdf' : undefined) || (fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : undefined) || (fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : undefined);

    await bot.sendDocument(
      chatId,
      fileBuffer,
      { caption: caption || `Ваш файл "${fileName}" готов!` },
      { 
        filename: fileName,
        contentType: normalizedMime
      }
    );
    
    // We don't have the user's UID here, so we can't log the action with logUserAction.
    // This could be improved by passing the UID if needed.
    console.log(`Successfully sent file "${fileName}" to chat ID ${chatId}`);

    return { success: true, message: "Файл успешно отправлен в ваш чат с ботом." };

  } catch (error: any) {
    console.error(`Telegram bot error sending to ${chatId}:`, error.response?.body || error.message);
    const errorMessage = error.response?.body?.description || "Не удалось отправить файл через бота. Возможно, вы не запустили бота или заблокировали его.";
    return { success: false, message: errorMessage };
  }
}

export async function syncTelegramChatId(): Promise<{ success: boolean; message: string; chatId?: number }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Требуется аутентификация.' };
  }

  try {
    const q = query(
      collection(db, 'telegram_chats'),
      where('refUserId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q as any);
    if (snap.empty) {
      return { success: false, message: 'Чат не найден. Напишите /start боту по вашей ссылке.' };
    }
    const chatData = snap.docs[0].data() as any;
    const chatId = Number(chatData?.chatId);
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return { success: false, message: 'Чат найден, но chat_id отсутствует.' };
    }
    const mongo = await getDb();
    const linkedUser = await mongo.collection<any>('users').findOne({
      telegramChatId: chatId,
      _id: { $ne: userId },
    });
    if (linkedUser) {
      return { success: false, message: 'Этот Telegram чат уже привязан к другому пользователю.' };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      telegramChatId: chatId,
      telegramUsername: chatData?.username || '',
      telegramLinkedAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, message: 'chat_id успешно привязан.', chatId };
  } catch (error: any) {
    console.error('Ошибка синхронизации chat_id:', error?.message || error);
    return { success: false, message: error?.message || 'Не удалось привязать chat_id.' };
  }
}
