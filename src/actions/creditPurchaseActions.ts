// src/actions/creditPurchaseActions.ts
'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { logUserAction } from '@/lib/logger';
import { grantCredits } from '@/services/credits';
import plansConfig from '@/lib/plans-config.json';

type OrderStatus = 'pending' | 'approved' | 'rejected' | 'invoice_issued';

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
  status: z.enum(['pending', 'approved', 'rejected', 'invoice_issued']).optional(),
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
  const user = await db.collection('users').findOne({ _id: userId });
  return user?.systemRole === 'Admin' || user?.systemRole === 'Super Admin';
}

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
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  await db.collection('credit_purchase_orders').insertOne({
    _id: orderId,
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
  });

  await logUserAction(userId, 'CREDIT_PAYMENT_SUBMITTED', { orderId, amount: pkg.totalPrice, credits: pkg.credits, method: 'sbp' });
  return { success: true, orderId, message: 'Чек отправлен. Оплата на проверке.' };
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
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const orderId = nanoid();
  const now = new Date();
  await db.collection('credit_purchase_orders').insertOne({
    _id: orderId,
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

  await logUserAction(userId, 'CREDIT_PAYMENT_SUBMITTED', { orderId, amount: pkg.totalPrice, credits: pkg.credits, method: 'legal' });
  return { success: true, orderId, message: 'Счет сформирован.' };
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
  const order = await db.collection('credit_purchase_orders').findOne({ _id: orderId });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }
  if (order.status === 'approved') {
    return { success: true, message: 'Заказ уже подтвержден.' };
  }
  if (order.status === 'rejected') {
    return { success: false, message: 'Заказ уже отклонен.' };
  }

  await grantCredits({
    userId: order.userId,
    amount: order.credits,
    type: 'purchased',
    source: 'credit_purchase',
    metadata: { orderId: order._id, packageName: order.packageName },
  });

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId },
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
  const order = await db.collection('credit_purchase_orders').findOne({ _id: orderId });
  if (!order) {
    return { success: false, message: 'Заказ не найден.' };
  }
  if (order.status === 'approved') {
    return { success: false, message: 'Нельзя отклонить подтвержденный заказ.' };
  }

  await db.collection('credit_purchase_orders').updateOne(
    { _id: orderId },
    { $set: { status: 'rejected', rejectedAt: new Date(), rejectedBy: adminUserId, rejectionReason: reason || null, updatedAt: new Date() } },
  );

  await logUserAction(order.userId, 'CREDIT_PAYMENT_REJECTED', { orderId, reason: reason || null });
  return { success: true, message: 'Оплата отклонена.' };
}
