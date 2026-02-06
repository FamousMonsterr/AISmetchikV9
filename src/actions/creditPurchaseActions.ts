// src/actions/creditPurchaseActions.ts
'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { logUserAction } from '@/lib/logger';
import { dispatchNotification } from '@/server-functions/notifications/dispatch';
import { expireCreditLot, grantCredits } from '@/services/credits';
import plansConfig from '@/lib/plans-config.json';

type OrderStatus = 'pending' | 'approved' | 'rejected' | 'invoice_issued' | 'auto_approved';

const CreditPackageSchema = z.object({
  name: z.string().min(1),
  credits: z.number().int().positive(),
  totalPrice: z.number().positive(),
});

const SbpOrderSchema = z.object({
  userId: z.string().min(1),
  packageName: z.string().min(1),
  receiptUrl: z.string().url(),
  receiptObjectKey: z.string().optional().nullable(),
  receiptFileName: z.string().optional().nullable(),
});

const LegalOrderSchema = z.object({
  userId: z.string().min(1),
  packageName: z.string().min(1),
  invoiceUrl: z.string().url(),
  invoiceNumber: z.string().min(1),
  companyId: z.string().min(1),
  companyName: z.string().min(1),
});

const OrdersQuerySchema = z.object({
  adminUserId: z.string().min(1),
  status: z.enum(['pending', 'approved', 'rejected', 'invoice_issued', 'auto_approved']).optional(),
});

const OrderActionSchema = z.object({
  adminUserId: z.string().min(1),
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

const creditPackages = (plansConfig.creditPackages || []).filter((pkg) => CreditPackageSchema.safeParse(pkg).success);

const findPackage = (name: string) => creditPackages.find((pkg) => pkg.name === name);

async function isAdmin(userId: string) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
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
        userId: String(admin._id),
        title,
        content,
        type: 'important',
        channels: ['in_app'],
        metadata,
      }),
    ),
  );
}

const addHours = (base: Date, hours: number) => new Date(base.getTime() + hours * 60 * 60 * 1000);
const AUTO_APPROVE_HOURS = 24;

export async function createSbpCreditOrder(data: z.infer<typeof SbpOrderSchema>): Promise<{ success: boolean; orderId?: string; message: string }> {
  const validation = SbpOrderSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для оплаты.' };
  }

  const { userId, packageName, receiptUrl, receiptObjectKey, receiptFileName } = validation.data;
  const pkg = findPackage(packageName);
  if (!pkg) {
    return { success: false, message: 'Пакет кредитов не найден.' };
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  await db.collection('credit_purchase_orders').insertOne({
    _id: orderId as any,
    userId,
    userEmail: user.email || null,
    userDisplayName: user.displayName || null,
    packageName: pkg.name,
    credits: pkg.credits,
    amount: pkg.totalPrice,
    status: 'pending' as OrderStatus,
    paymentMethod: 'sbp',
    receiptUrl,
    receiptObjectKey: receiptObjectKey || null,
    receiptFileName: receiptFileName || null,
    createdAt: now,
    updatedAt: now,
    autoApproveAt: addHours(now, AUTO_APPROVE_HOURS),
  });

  const granted = await grantCredits({
    userId,
    amount: pkg.credits,
    type: 'purchased',
    source: 'credit_purchase_pending',
    metadata: { orderId, packageName: pkg.name },
  });

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId as any },
    { $set: { grantedLotId: granted.lotId, grantedAt: new Date() } },
  );

  await dispatchNotification({
    userId,
    title: 'Оплата принята',
    content: 'Чек получен. Кредиты уже доступны, проверка займет до 24 часов.',
    type: 'important',
    metadata: { orderId },
  });

  await notifyAdmins(
    'Нужна проверка оплаты кредитов',
    `Поступил чек по СБП от пользователя ${user.email || user.displayName || userId}. Сумма: ${pkg.totalPrice} ₽.`,
    { orderId, userId, amount: pkg.totalPrice, credits: pkg.credits },
  );

  await logUserAction(userId, 'CREDIT_PAYMENT_SUBMITTED', { orderId, amount: pkg.totalPrice, credits: pkg.credits, method: 'sbp' });
  return { success: true, orderId, message: 'Чек отправлен. Кредиты доступны, проверка до 24 часов.' };
}

export async function createLegalCreditOrder(data: z.infer<typeof LegalOrderSchema>): Promise<{ success: boolean; orderId?: string; message: string }> {
  const validation = LegalOrderSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для счета.' };
  }

  const { userId, packageName, invoiceUrl, invoiceNumber, companyId, companyName } = validation.data;
  const pkg = findPackage(packageName);
  if (!pkg) {
    return { success: false, message: 'Пакет кредитов не найден.' };
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  await db.collection('credit_purchase_orders').insertOne({
    _id: orderId as any,
    userId,
    userEmail: user.email || null,
    userDisplayName: user.displayName || null,
    packageName: pkg.name,
    credits: pkg.credits,
    amount: pkg.totalPrice,
    status: 'invoice_issued' as OrderStatus,
    paymentMethod: 'legal',
    invoiceUrl,
    invoiceNumber,
    companyId,
    companyName,
    createdAt: now,
    updatedAt: now,
  });

  const granted = await grantCredits({
    userId,
    amount: pkg.credits,
    type: 'purchased',
    source: 'credit_purchase_pending',
    metadata: { orderId, packageName: pkg.name, paymentMethod: 'legal' },
  });

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId as any },
    { $set: { grantedLotId: granted.lotId, grantedAt: new Date() } },
  );

  await dispatchNotification({
    userId,
    title: 'Счет сформирован',
    content: 'Счет отправлен. Кредиты уже доступны, после оплаты статус будет подтвержден.',
    type: 'informational',
    metadata: { orderId },
  });

  await notifyAdmins(
    'Сформирован счет на кредиты',
    `Пользователь ${user.email || user.displayName || userId} запросил счет на пакет "${pkg.name}".`,
    { orderId, userId, amount: pkg.totalPrice, credits: pkg.credits },
  );

  await logUserAction(userId, 'CREDIT_PAYMENT_SUBMITTED', { orderId, amount: pkg.totalPrice, credits: pkg.credits, method: 'legal' });
  return { success: true, orderId, message: 'Счет сформирован. Кредиты уже доступны.' };
}

export async function getCreditPurchaseOrders(data: z.infer<typeof OrdersQuerySchema>): Promise<{ success: boolean; orders: any[]; message?: string }> {
  const validation = OrdersQuerySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, orders: [], message: 'Неверные данные запроса.' };
  }

  const { adminUserId, status } = validation.data;
  if (!(await isAdmin(adminUserId))) {
    return { success: false, orders: [], message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  const orders = await db.collection('credit_purchase_orders').find(filter).sort({ createdAt: -1 }).toArray();
  return { success: true, orders };
}

export async function approveCreditPurchaseOrder(data: z.infer<typeof OrderActionSchema>): Promise<{ success: boolean; message: string }> {
  const validation = OrderActionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для подтверждения.' };
  }

  const { adminUserId, orderId } = validation.data;
  if (!(await isAdmin(adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const order = await db.collection('credit_purchase_orders').findOne({ _id: orderId as any });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }
  if (order.status === 'approved') {
    return { success: true, message: 'Заказ уже подтвержден.' };
  }
  if (order.status === 'rejected') {
    return { success: false, message: 'Заказ уже отклонен.' };
  }
  if (!order.grantedLotId) {
    const granted = await grantCredits({
      userId: order.userId,
      amount: order.credits,
      type: 'purchased',
      source: 'credit_purchase',
      metadata: { orderId: order._id, packageName: order.packageName },
    });
    await db.collection('credit_purchase_orders').updateOne(
      { _id: orderId as any },
      { $set: { grantedLotId: granted.lotId, grantedAt: new Date() } },
    );
  }

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId as any },
    { $set: { status: 'approved', approvedAt: new Date(), approvedBy: adminUserId, updatedAt: new Date() } },
  );

  await logUserAction(order.userId, 'CREDIT_PAYMENT_APPROVED', { orderId, credits: order.credits, amount: order.amount });
  return { success: true, message: 'Оплата подтверждена, кредиты начислены.' };
}

export async function rejectCreditPurchaseOrder(data: z.infer<typeof OrderActionSchema>): Promise<{ success: boolean; message: string }> {
  const validation = OrderActionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для отклонения.' };
  }

  const { adminUserId, orderId, reason } = validation.data;
  if (!(await isAdmin(adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  const order = await db.collection('credit_purchase_orders').findOne({ _id: orderId as any });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }
  if (order.status === 'approved') {
    return { success: false, message: 'Нельзя отклонить подтвержденный заказ.' };
  }

  if (order.grantedLotId) {
    try {
      await expireCreditLot({
        userId: order.userId,
        lotId: order.grantedLotId,
        reason: 'payment_rejected',
        metadata: { orderId: order._id },
      });
    } catch (error) {
      console.warn('Failed to expire pending credits', error);
    }
  }

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId as any },
    { $set: { status: 'rejected', rejectedAt: new Date(), rejectedBy: adminUserId, rejectionReason: reason || null, updatedAt: new Date() } },
  );

  await logUserAction(order.userId, 'CREDIT_PAYMENT_REJECTED', { orderId, reason: reason || null });
  return { success: true, message: 'Оплата отклонена.' };
}

export async function autoApproveCreditPurchaseOrders() {
  const db = await getDb();
  const now = new Date();
  const pending = await db
    .collection('credit_purchase_orders')
    .find({ status: 'pending', autoApproveAt: { $lte: now } })
    .limit(200)
    .toArray();

  let processed = 0;
  for (const order of pending) {
    await db.collection('credit_purchase_orders').updateOne(
      { _id: order._id as any },
      { $set: { status: 'auto_approved', approvedAt: new Date(), updatedAt: new Date() } },
    );
    await logUserAction(order.userId, 'CREDIT_PAYMENT_AUTO_APPROVED', { orderId: order._id, credits: order.credits, amount: order.amount });
    processed += 1;
  }
  return { success: true, processed };
}
