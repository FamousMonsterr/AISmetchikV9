// src/actions/supportActions.ts
'use server';

import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { getEnvSettings } from '@/actions/adminActions';
import { getMailer, getMailerFrom, isMailerConfigured } from '@/lib/mailer';

type SupportStatus = 'open' | 'closed';
type SatisfactionStatus = 'pending' | 'satisfied' | 'unsatisfied';

export type SupportThread = {
  id: string;
  userId: string;
  managerId?: string | null;
  userDisplayName?: string;
  userEmail?: string | null;
  status: SupportStatus;
  satisfaction?: SatisfactionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date | null;
  lastMessageBy?: 'user' | 'manager' | 'system' | null;
  firstResponseAt?: Date | null;
  firstResponseMs?: number | null;
};

export type SupportMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: 'user' | 'manager' | 'system';
  message: string;
  createdAt: Date;
};

const ThreadRequestSchema = z.object({
  userId: z.string().min(1),
});

const MessageSchema = z.object({
  threadId: z.string().min(1),
  senderId: z.string().min(1),
  senderRole: z.enum(['user', 'manager']),
  message: z.string().min(1).max(4000),
});

const StatusSchema = z.object({
  threadId: z.string().min(1),
  actorId: z.string().min(1),
  status: z.enum(['open', 'closed']).optional(),
  satisfaction: z.enum(['pending', 'satisfied', 'unsatisfied']).optional(),
});

const ManagerThreadsSchema = z.object({
  managerId: z.string().min(1),
  includeClosed: z.boolean().optional(),
});

const MessagesRequestSchema = z.object({
  threadId: z.string().min(1),
  requesterId: z.string().min(1),
});

async function resolveManagerId(userDoc: any) {
  if (userDoc?.managerId) return userDoc.managerId;

  if (userDoc?.referredBy) {
    const db = await getDb();
    const partner = await db.collection('users').findOne({ _id: userDoc.referredBy, isPartner: true });
    if (partner?._id) return partner._id;
  }

  const envSettings = await getEnvSettings();
  const superAdminEmail =
    envSettings.superAdminEmail ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL;

  if (superAdminEmail) {
    const db = await getDb();
    const adminUser = await db.collection('users').findOne({ email: superAdminEmail.toLowerCase() });
    if (adminUser?._id) return adminUser._id;
  }

  return null;
}

async function notifyUser({
  userId,
  title,
  content,
  threadId,
}: {
  userId: string;
  title: string;
  content: string;
  threadId: string;
}) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) return;

  await db.collection('user_notifications').insertOne({
    _id: nanoid(),
    userId,
    title,
    content,
    type: 'important',
    status: 'unread',
    source: 'support',
    threadId,
    createdAt: new Date(),
  });

  const mailerReady = await isMailerConfigured();
  if (mailerReady && user.email) {
    const mailer = await getMailer();
    const from = await getMailerFrom();
    await mailer.sendMail({
      from,
      to: user.email,
      subject: title,
      text: content,
    });
  }

  if (user.telegramChatId) {
    const envSettings = await getEnvSettings();
    const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const bot = new TelegramBot(botToken);
      await bot.sendMessage(user.telegramChatId, `${title}\n\n${content}`);
    }
  }
}

export async function getOrCreateSupportThread(data: z.infer<typeof ThreadRequestSchema>): Promise<{
  success: boolean;
  message?: string;
  thread?: SupportThread;
  manager?: { id: string; displayName: string; email: string | null };
}> {
  const validation = ThreadRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }

  const { userId } = validation.data;
  const db = await getDb();
  const userDoc = await db.collection('users').findOne({ _id: userId });
  if (!userDoc) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const managerId = await resolveManagerId(userDoc);
  let thread = await db.collection('support_threads').findOne({ userId });

  if (!thread) {
    const now = new Date();
    const threadId = nanoid();
    const newThread = {
      _id: threadId,
      userId,
      userDisplayName: userDoc.displayName,
      userEmail: userDoc.email || null,
      managerId,
      status: 'open',
      satisfaction: 'pending',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
      lastMessageBy: null,
      firstResponseAt: null,
      firstResponseMs: null,
    };
    await db.collection('support_threads').insertOne(newThread);
    thread = newThread;
  } else if (!thread.managerId && managerId) {
    await db.collection('support_threads').updateOne({ _id: thread._id }, { $set: { managerId, updatedAt: new Date() } });
    thread.managerId = managerId;
  }

  let managerInfo = null;
  if (thread.managerId) {
    const managerDoc = await db.collection('users').findOne({ _id: thread.managerId });
    if (managerDoc) {
      managerInfo = {
        id: managerDoc._id,
        displayName: managerDoc.displayName,
        email: managerDoc.email || null,
      };
    }
  }

  return {
    success: true,
    thread: {
      id: thread._id,
      userId: thread.userId,
      managerId: thread.managerId ?? null,
      status: thread.status,
      satisfaction: thread.satisfaction ?? 'pending',
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      lastMessageAt: thread.lastMessageAt ?? null,
      lastMessageBy: thread.lastMessageBy ?? null,
      firstResponseAt: thread.firstResponseAt ?? null,
      firstResponseMs: thread.firstResponseMs ?? null,
    },
    manager: managerInfo || undefined,
  };
}

export async function getSupportThreadMessages(data: z.infer<typeof MessagesRequestSchema>): Promise<{
  success: boolean;
  message?: string;
  messages?: SupportMessage[];
}> {
  const validation = MessagesRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { threadId, requesterId } = validation.data;
  const db = await getDb();
  const thread = await db.collection('support_threads').findOne({ _id: threadId });
  if (!thread) {
    return { success: false, message: 'Диалог не найден.' };
  }
  if (thread.userId !== requesterId && thread.managerId !== requesterId) {
    return { success: false, message: 'Доступ запрещен.' };
  }

  const docs = await db
    .collection('support_messages')
    .find({ threadId })
    .sort({ createdAt: 1 })
    .toArray();

  return {
    success: true,
    messages: docs.map((doc: any) => ({
      id: doc._id,
      threadId: doc.threadId,
      senderId: doc.senderId,
      senderRole: doc.senderRole,
      message: doc.message,
      createdAt: doc.createdAt,
    })),
  };
}

export async function sendSupportMessage(data: z.infer<typeof MessageSchema>): Promise<{ success: boolean; message?: string }> {
  const validation = MessageSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { threadId, senderId, senderRole, message } = validation.data;
  const db = await getDb();
  const thread = await db.collection('support_threads').findOne({ _id: threadId });
  if (!thread) {
    return { success: false, message: 'Диалог не найден.' };
  }

  const senderDoc = await db.collection('users').findOne({ _id: senderId });
  if (!senderDoc) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const isManager =
    thread.managerId === senderId ||
    senderDoc.systemRole === 'Admin' ||
    senderDoc.systemRole === 'Super Admin';

  if (senderRole === 'user' && thread.userId !== senderId) {
    return { success: false, message: 'Доступ запрещен.' };
  }
  if (senderRole === 'manager' && !isManager) {
    return { success: false, message: 'Доступ запрещен.' };
  }

  const now = new Date();
  await db.collection('support_messages').insertOne({
    _id: nanoid(),
    threadId,
    senderId,
    senderRole,
    message,
    createdAt: now,
  });

  const update: Record<string, any> = {
    updatedAt: now,
    lastMessageAt: now,
    lastMessageBy: senderRole,
    status: 'open',
  };

  if (senderRole === 'manager' && !thread.firstResponseAt) {
    update.firstResponseAt = now;
    const createdAt = thread.createdAt ? new Date(thread.createdAt) : now;
    update.firstResponseMs = Math.max(0, now.getTime() - createdAt.getTime());
  }

  await db.collection('support_threads').updateOne({ _id: threadId }, { $set: update });

  const targetId = senderRole === 'user' ? thread.managerId : thread.userId;
  if (targetId) {
    const title =
      senderRole === 'user'
        ? `Новое сообщение от ${senderDoc.displayName || senderDoc.email || 'пользователя'}`
        : 'Ответ менеджера в поддержке';
    const content = message.length > 400 ? `${message.slice(0, 400)}…` : message;
    await notifyUser({ userId: targetId, title, content, threadId });
  }

  return { success: true };
}

export async function updateSupportThreadStatus(data: z.infer<typeof StatusSchema>): Promise<{ success: boolean; message?: string }> {
  const validation = StatusSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { threadId, actorId, status, satisfaction } = validation.data;
  const db = await getDb();
  const thread = await db.collection('support_threads').findOne({ _id: threadId });
  if (!thread) {
    return { success: false, message: 'Диалог не найден.' };
  }

  const actor = await db.collection('users').findOne({ _id: actorId });
  if (!actor) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const isManager =
    thread.managerId === actorId ||
    actor.systemRole === 'Admin' ||
    actor.systemRole === 'Super Admin';
  const isOwner = thread.userId === actorId;

  if (!isManager && !isOwner) {
    return { success: false, message: 'Доступ запрещен.' };
  }

  const update: Record<string, any> = { updatedAt: new Date() };
  if (status) update.status = status;
  if (satisfaction && isOwner) update.satisfaction = satisfaction;

  await db.collection('support_threads').updateOne({ _id: threadId }, { $set: update });
  return { success: true };
}

export async function listSupportThreadsForManager(data: z.infer<typeof ManagerThreadsSchema>): Promise<{
  success: boolean;
  threads?: SupportThread[];
  message?: string;
}> {
  const validation = ManagerThreadsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { managerId, includeClosed } = validation.data;
  const db = await getDb();
  const manager = await db.collection('users').findOne({ _id: managerId });
  if (!manager) {
    return { success: false, message: 'Менеджер не найден.' };
  }

  const filter: Record<string, any> = {};
  if (manager.systemRole === 'Super Admin') {
    // Super Admin sees all threads
  } else {
    filter.managerId = managerId;
  }
  if (!includeClosed) {
    filter.status = 'open';
  }

  const threads = await db.collection('support_threads').find(filter).sort({ updatedAt: -1 }).toArray();
  return {
    success: true,
    threads: threads.map((thread: any) => ({
      id: thread._id,
      userId: thread.userId,
      managerId: thread.managerId ?? null,
      userDisplayName: thread.userDisplayName,
      userEmail: thread.userEmail ?? null,
      status: thread.status,
      satisfaction: thread.satisfaction ?? 'pending',
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      lastMessageAt: thread.lastMessageAt ?? null,
      lastMessageBy: thread.lastMessageBy ?? null,
      firstResponseAt: thread.firstResponseAt ?? null,
      firstResponseMs: thread.firstResponseMs ?? null,
    })),
  };
}
