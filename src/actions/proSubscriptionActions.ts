// src/actions/proSubscriptionActions.ts
'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { addMonths } from 'date-fns';
import { getDb } from '@/lib/mongodb';
import { dispatchNotification } from '@/server-functions/notifications/dispatch';
import { logUserAction } from '@/lib/logger';
import proConfig from '@/lib/pro-subscription-config.json';

const MONTHLY_PRICE = proConfig.monthlyPrice || 2990;
const LIFETIME_MONTHS = proConfig.lifetimeMonths || 24;
const ALLOWED_MONTHS = new Set([...(proConfig.durationsMonths || []), LIFETIME_MONTHS]);
const PENDING_PRO_DAYS = 1;
const AUTO_APPROVE_HOURS = 24;

const SbpOrderSchema = z.object({
  userId: z.string().min(1),
  months: z.number().int().positive(),
  receiptUrl: z.string().url(),
  receiptObjectKey: z.string().optional().nullable(),
  receiptFileName: z.string().optional().nullable(),
});

const LegalOrderSchema = z.object({
  userId: z.string().min(1),
  months: z.number().int().positive(),
  invoiceUrl: z.string().url(),
  invoiceNumber: z.string().min(1),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
});

const OrderActionSchema = z.object({
  adminUserId: z.string().min(1),
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

type OrderStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'invoice_issued';

const normalizeDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (base: Date, hours: number) => new Date(base.getTime() + hours * 60 * 60 * 1000);

async function isAdminUser(userId: string) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  return user?.systemRole === 'Admin' || user?.systemRole === 'Super Admin';
}

async function getAdminUsers() {
  const db = await getDb();
  return db
    .collection('users')
    .find({ systemRole: { $in: ['Admin', 'Super Admin'] } }, { projection: { _id: 1, email: 1 } })
    .toArray();
}

async function notifyAdmins(title: string, content: string, metadata: Record<string, any>) {
  const admins = await getAdminUsers();
  await Promise.all(
    admins.map((admin) =>
      dispatchNotification({
        userId: admin._id,
        title,
        content,
        type: 'important',
        channels: ['in_app'],
        metadata,
      }),
    ),
  );
}

function resolveAmount(months: number) {
  return months * MONTHLY_PRICE;
}

function buildPlanExpiry(now: Date, months: number, isLifetime: boolean, existingExpiresAt: Date | null) {
  if (isLifetime) return null;
  const base = existingExpiresAt && existingExpiresAt > now ? existingExpiresAt : now;
  return addMonths(base, months);
}

async function applyPendingPro(user: any, orderId: string) {
  const now = new Date();
  const pendingUntil = addDays(now, PENDING_PRO_DAYS);
  const updates: Record<string, any> = {
    pendingProOrderId: orderId,
    pendingProExpiresAt: pendingUntil,
    updatedAt: now,
  };

  if (user.plan !== 'PRO') {
    updates.plan = 'PRO';
    updates.planSource = 'pending_payment';
    updates.originalPlan = user.plan || 'Free';
    updates.planExpiresAt = pendingUntil;
  }

  const db = await getDb();
  await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
}

async function applyPaidPro(order: any, status: OrderStatus, actorId?: string) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: order.userId });
  if (!user) return;

  const now = new Date();
  const currentExpiresAt = normalizeDate(user.planExpiresAt);
  const isLifetime = order.isLifetime;
  const newExpiresAt = buildPlanExpiry(now, order.planMonths, isLifetime, currentExpiresAt);

  const updates: Record<string, any> = {
    plan: 'PRO',
    planSource: 'paid',
    planExpiresAt: newExpiresAt,
    originalPlan: user.originalPlan || (user.plan === 'PRO' ? 'Free' : user.plan || 'Free'),
    pendingProOrderId: null,
    pendingProExpiresAt: null,
    updatedAt: now,
  };

  await db.collection('users').updateOne({ _id: order.userId }, { $set: updates });
  await db.collection('pro_subscription_orders').updateOne(
    { _id: order._id },
    {
      $set: {
        status,
        approvedAt: now,
        approvedBy: actorId || null,
        updatedAt: now,
      },
    },
  );

  await dispatchNotification({
    userId: order.userId,
    title: 'Подписка PRO подтверждена',
    content: isLifetime
      ? 'Оплата подтверждена. Вам активирован пожизненный PRO.'
      : `Оплата подтверждена. Подписка PRO активирована до ${newExpiresAt?.toLocaleDateString('ru-RU')}.`,
    type: 'informational',
    metadata: { orderId: order._id, planMonths: order.planMonths, status },
  });

  await logUserAction(order.userId, status === 'auto_approved' ? 'PRO_PAYMENT_AUTO_APPROVED' : 'PRO_PAYMENT_APPROVED', {
    orderId: order._id,
    planMonths: order.planMonths,
    isLifetime,
  });
}

async function rejectPendingPro(order: any, reason?: string, actorId?: string) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: order.userId });
  const now = new Date();

  if (user?.planSource === 'pending_payment' && user?.pendingProOrderId === order._id) {
    await db.collection('users').updateOne(
      { _id: order.userId },
      {
        $set: {
          plan: user.originalPlan || 'Free',
          planSource: null,
          planExpiresAt: null,
          originalPlan: null,
          pendingProOrderId: null,
          pendingProExpiresAt: null,
          updatedAt: now,
        },
      },
    );
  } else if (user?.pendingProOrderId === order._id) {
    await db.collection('users').updateOne(
      { _id: order.userId },
      { $set: { pendingProOrderId: null, pendingProExpiresAt: null, updatedAt: now } },
    );
  }

  await db.collection('pro_subscription_orders').updateOne(
    { _id: order._id },
    {
      $set: {
        status: 'rejected',
        rejectedAt: now,
        rejectedBy: actorId || null,
        rejectionReason: reason || null,
        updatedAt: now,
      },
    },
  );

  await dispatchNotification({
    userId: order.userId,
    title: 'Платеж PRO отклонен',
    content: reason ? `Платеж отклонен. Причина: ${reason}` : 'Платеж отклонен. Свяжитесь с поддержкой для уточнения.',
    type: 'important',
    metadata: { orderId: order._id },
  });

  await logUserAction(order.userId, 'PRO_PAYMENT_REJECTED', { orderId: order._id, reason: reason || null });
}

export async function createSbpProSubscriptionOrder(data: z.infer<typeof SbpOrderSchema>) {
  const validation = SbpOrderSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для оплаты.' };
  }

  const { userId, months, receiptUrl, receiptObjectKey, receiptFileName } = validation.data;
  if (!ALLOWED_MONTHS.has(months)) {
    return { success: false, message: 'Некорректный срок подписки.' };
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  const isLifetime = months === LIFETIME_MONTHS;
  const amount = resolveAmount(months);
  const autoApproveAt = addHours(now, AUTO_APPROVE_HOURS);

  await db.collection('pro_subscription_orders').insertOne({
    _id: orderId,
    userId,
    userEmail: user.email || null,
    userDisplayName: user.displayName || null,
    status: 'pending',
    paymentMethod: 'sbp',
    planMonths: months,
    isLifetime,
    amount,
    currency: 'RUB',
    receiptUrl,
    receiptObjectKey: receiptObjectKey || null,
    receiptFileName: receiptFileName || null,
    createdAt: now,
    updatedAt: now,
    autoApproveAt,
    temporaryProUntil: addDays(now, PENDING_PRO_DAYS),
  });

  await applyPendingPro(user, orderId);

  await dispatchNotification({
    userId,
    title: 'Платеж принят на проверку',
    content: 'Мы проверим оплату в течение 24 часов. На время проверки PRO активирован на 1 день.',
    type: 'important',
    metadata: { orderId },
  });

  await notifyAdmins(
    'Нужна проверка оплаты PRO',
    `Поступил чек по СБП от пользователя ${user.email || user.displayName || userId}. Срок: ${months} мес. Сумма: ${amount} ₽.`,
    { orderId, userId, amount, months },
  );

  await logUserAction(userId, 'PRO_PAYMENT_SUBMITTED', { orderId, amount, months, method: 'sbp' });

  return { success: true, orderId };
}

export async function createLegalProSubscriptionOrder(data: z.infer<typeof LegalOrderSchema>) {
  const validation = LegalOrderSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для счета.' };
  }

  const { userId, months, invoiceUrl, invoiceNumber, companyId, companyName } = validation.data;
  if (!ALLOWED_MONTHS.has(months)) {
    return { success: false, message: 'Некорректный срок подписки.' };
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  const isLifetime = months === LIFETIME_MONTHS;
  const amount = resolveAmount(months);

  await db.collection('pro_subscription_orders').insertOne({
    _id: orderId,
    userId,
    userEmail: user.email || null,
    userDisplayName: user.displayName || null,
    status: 'invoice_issued',
    paymentMethod: 'legal',
    planMonths: months,
    isLifetime,
    amount,
    currency: 'RUB',
    invoiceUrl,
    invoiceNumber,
    companyId: companyId || null,
    companyName: companyName || null,
    createdAt: now,
    updatedAt: now,
  });

  await dispatchNotification({
    userId,
    title: 'Счет на PRO готов',
    content: 'Счет сформирован и доступен в истории документов. После оплаты мы активируем подписку.',
    type: 'informational',
    metadata: { orderId },
  });

  await notifyAdmins(
    'Сформирован счет на PRO',
    `Пользователь ${user.email || user.displayName || userId} запросил счет на PRO (${months} мес).`,
    { orderId, userId, amount, months },
  );

  await logUserAction(userId, 'PRO_PAYMENT_SUBMITTED', { orderId, amount, months, method: 'legal' });

  return { success: true, orderId };
}

export async function getProSubscriptionOrders(data: { adminUserId: string; status?: OrderStatus }) {
  if (!data?.adminUserId) {
    return { success: false, orders: [], message: 'Не указан администратор.' };
  }
  const isAdmin = await isAdminUser(data.adminUserId);
  if (!isAdmin) {
    return { success: false, orders: [], message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const filter = data.status ? { status: data.status } : {};
  const orders = await db
    .collection('pro_subscription_orders')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  return { success: true, orders };
}

export async function approveProSubscriptionOrder(data: z.infer<typeof OrderActionSchema>) {
  const validation = OrderActionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { adminUserId, orderId } = validation.data;
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const order = await db.collection('pro_subscription_orders').findOne({ _id: orderId });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }
  if (order.status === 'approved' || order.status === 'auto_approved') {
    return { success: true, message: 'Уже подтверждено.' };
  }

  await applyPaidPro(order, 'approved', adminUserId);
  return { success: true, message: 'Подписка подтверждена.' };
}

export async function rejectProSubscriptionOrder(data: z.infer<typeof OrderActionSchema>) {
  const validation = OrderActionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { adminUserId, orderId, reason } = validation.data;
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const order = await db.collection('pro_subscription_orders').findOne({ _id: orderId });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }

  await rejectPendingPro(order, reason, adminUserId);
  return { success: true, message: 'Платеж отклонен.' };
}

export async function autoApproveProSubscriptionOrders() {
  const db = await getDb();
  const now = new Date();
  const pending = await db
    .collection('pro_subscription_orders')
    .find({ status: 'pending', autoApproveAt: { $lte: now } })
    .limit(200)
    .toArray();

  let processed = 0;
  for (const order of pending) {
    await applyPaidPro(order, 'auto_approved');
    processed += 1;
  }
  return { success: true, processed };
}
