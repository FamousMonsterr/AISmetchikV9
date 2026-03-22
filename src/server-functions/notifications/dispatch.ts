// src/server-functions/notifications/dispatch.ts
'use server';

import { db } from '@/lib/db';
import { collection, doc, serverTimestamp, setDoc } from '@/lib/db-server';
import { sendTelegramMessage, type TelegramDispatchResult } from './telegram';

export type NotificationChannel = 'in_app' | 'telegram';

export type DispatchNotificationInput = {
  userId: string;
  title: string;
  content: string;
  type?: 'informational' | 'important';
  status?: 'unread' | 'read';
  projectId?: string | null;
  channels?: NotificationChannel[];
  telegram?: {
    chatId?: number;
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    disableWebPagePreview?: boolean;
  };
  idempotencyKey?: string;
  metadata?: Record<string, any>;
};

export type DispatchNotificationResult = {
  success: boolean;
  inAppId?: string | null;
  telegram?: TelegramDispatchResult;
};

export async function dispatchNotification(input: DispatchNotificationInput): Promise<DispatchNotificationResult> {
  if (!input.userId || !input.title || !input.content) {
    return { success: false };
  }

  const channels = input.channels?.length ? input.channels : ['in_app', 'telegram'];
  let inAppId: string | null = null;
  if (channels.includes('in_app')) {
    const notifRef = doc(collection(db, 'user_notifications'));
    await setDoc(notifRef, {
      userId: input.userId,
      title: input.title,
      content: input.content,
      type: input.type || 'informational',
      status: input.status || 'unread',
      createdAt: serverTimestamp(),
      projectId: input.projectId || null,
      metadata: input.metadata || null,
    } as any);
    inAppId = notifRef.id;
  }

  let telegramResult: TelegramDispatchResult | undefined;
  if (channels.includes('telegram')) {
    const message = `${input.title}\n${input.content}${input.projectId ? `\nПроект: ${input.projectId}` : ''}`;
    telegramResult = await sendTelegramMessage({
      userId: input.userId,
      chatId: input.telegram?.chatId,
      message,
      parseMode: input.telegram?.parseMode,
      disableWebPagePreview: input.telegram?.disableWebPagePreview,
      idempotencyKey: input.idempotencyKey ? `telegram:${input.idempotencyKey}` : undefined,
      metadata: input.metadata,
    });
  }

  return { success: true, inAppId, telegram: telegramResult };
}
