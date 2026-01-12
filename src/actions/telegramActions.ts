// src/actions/telegramActions.ts
'use server';

import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';
import { logUserAction } from '@/lib/logger';
import { doc, updateDoc } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';
import { validate } from '@telegram-apps/init-data-node';
import { getEnvSettings } from '@/actions/adminActions';

// This fix is necessary for node-telegram-bot-api to work correctly with Buffers in some environments.
process.env.NTBA_FIX_350 = '1';

const LinkAccountSchema = z.object({
  initData: z.string(),
  userId: z.string().min(1),
});

export async function linkTelegramAccount(data: z.infer<typeof LinkAccountSchema>): Promise<{ success: boolean; message: string; telegramUser?: any; }> {
    const validation = LinkAccountSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Неверные данные для привязки.' };
    }

    const { initData, userId } = validation.data;
    const envSettings = await getEnvSettings();
    const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return { success: false, message: 'Сервер не настроен для работы с Telegram.' };
    }

    try {
        const validatedData = await validate(initData, botToken, { expiresIn: 3600 }); // 1 hour expiration
        
        if (!validatedData.user) {
            throw new Error("Не удалось получить данные пользователя из Telegram.");
        }
        
        const { id: telegramChatId, username: telegramUsername, firstName } = validatedData.user;
        
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            telegramChatId: telegramChatId,
            telegramUsername: telegramUsername || '',
            // You might want to update the displayName as well
            // displayName: firstName, 
        });

        return { success: true, message: 'Аккаунт Telegram успешно привязан.', telegramUser: validatedData.user };

    } catch (error: any) {
        console.error("Ошибка привязки аккаунта Telegram:", error);
        return { success: false, message: error.message || 'Ошибка валидации данных Telegram.' };
    }
}


const SendFileSchema = z.object({
  chatId: z.number(),
  fileData: z.string(), // base64 encoded string
  fileName: z.string(),
  fileMime: z.string().optional(),
  caption: z.string().optional(),
});

export async function sendFileToTelegramUser(data: z.infer<typeof SendFileSchema>): Promise<{ success: boolean; message: string }> {
  const envSettings = await getEnvSettings();
  const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    return { success: false, message: "Сервер не настроен для отправки файлов." };
  }

  const validation = SendFileSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: "Неверные данные для отправки файла." };
  }
  
  const { chatId, fileData, fileName, fileMime, caption } = validation.data;

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
