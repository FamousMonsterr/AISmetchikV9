'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type {
  HubOrder,
  HubResponse,
  HubReview,
  HubFilters,
  HubCategory,
  HubOrderStatus,
} from '@/types/hub';

// --- helpers ---

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Необходима авторизация');
  return session.user;
}

async function getOrdersCollection() {
  const db = await getDb();
  return db.collection<HubOrder>('hub_orders');
}

async function getResponsesCollection() {
  const db = await getDb();
  return db.collection<HubResponse>('hub_responses');
}

async function getReviewsCollection() {
  const db = await getDb();
  return db.collection<HubReview>('hub_reviews');
}

async function getUsersCollection() {
  const db = await getDb();
  return db.collection('users');
}

// --- schemas ---

const createOrderSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  city: z.string().min(2).max(100),
  category: z.enum(['slabotochka', 'electrika', 'svyaz', 'videokontrol', 'skud', 'ops', 'other']),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  deadline: z.string().min(1),
  files: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number(),
  })).optional().default([]),
});

const submitResponseSchema = z.object({
  orderId: z.string().min(1),
  message: z.string().min(10).max(2000),
  proposedPrice: z.number().min(1),
  proposedDeadline: z.string().min(1),
});

const submitReviewSchema = z.object({
  orderId: z.string().min(1),
  toUserId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5).max(1000),
  role: z.enum(['contractor', 'client']),
});

// --- actions ---

export async function createHubOrder(raw: z.infer<typeof createOrderSchema>) {
  const user = await requireAuth();
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Ошибка валидации: ' + parsed.error.issues.map(i => i.message).join(', ') };
  }
  const data = parsed.data;

  const col = await getOrdersCollection();
  const now = new Date();

  const order: HubOrder = {
    id: nanoid(12),
    userId: user.id!,
    userName: user.name || undefined,
    userAvatar: user.image || undefined,
    title: data.title,
    description: data.description,
    city: data.city,
    category: data.category as HubCategory,
    files: data.files.map(f => ({ ...f, uploadedAt: now })),
    aiEstimate: null,
    status: 'open',
    budget: { min: data.budgetMin, max: data.budgetMax },
    deadline: data.deadline,
    responseCount: 0,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(order);
  return { success: true, message: 'Заказ создан', orderId: order.id };
}

export async function updateHubOrderEstimate(orderId: string, aiEstimate: HubOrder['aiEstimate']) {
  const user = await requireAuth();
  const col = await getOrdersCollection();

  const order = await col.findOne({ id: orderId });
  if (!order) return { success: false, message: 'Заказ не найден' };
  if (order.userId !== user.id) return { success: false, message: 'Нет доступа' };

  await col.updateOne(
    { id: orderId },
    { $set: { aiEstimate, updatedAt: new Date() } },
  );

  return { success: true, message: 'Смета обновлена' };
}

export async function publishHubOrder(orderId: string) {
  const user = await requireAuth();
  const col = await getOrdersCollection();

  const order = await col.findOne({ id: orderId });
  if (!order) return { success: false, message: 'Заказ не найден' };
  if (order.userId !== user.id) return { success: false, message: 'Нет доступа' };
  if (order.status !== 'open') return { success: false, message: 'Заказ уже опубликован или закрыт' };

  // already public — no-op, but return success
  return { success: true, message: 'Заказ опубликован и доступен исполнителям' };
}

export async function closeHubOrder(orderId: string) {
  const user = await requireAuth();
  const col = await getOrdersCollection();

  const order = await col.findOne({ id: orderId });
  if (!order) return { success: false, message: 'Заказ не найден' };
  if (order.userId !== user.id) return { success: false, message: 'Нет доступа' };

  await col.updateOne(
    { id: orderId },
    { $set: { status: 'cancelled' as HubOrderStatus, updatedAt: new Date() } },
  );

  return { success: true, message: 'Заказ закрыт' };
}

export async function submitHubResponse(raw: z.infer<typeof submitResponseSchema>) {
  const user = await requireAuth();
  const parsed = submitResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Ошибка валидации: ' + parsed.error.issues.map(i => i.message).join(', ') };
  }
  const data = parsed.data;

  const ordersCol = await getOrdersCollection();
  const responsesCol = await getResponsesCollection();
  const usersCol = await getUsersCollection();

  const order = await ordersCol.findOne({ id: data.orderId });
  if (!order) return { success: false, message: 'Заказ не найден' };
  if (order.status !== 'open') return { success: false, message: 'Заказ уже не принимает отклики' };
  if (order.userId === user.id) return { success: false, message: 'Нельзя откликнуться на свой заказ' };

  // check if already responded
  const existing = await responsesCol.findOne({ orderId: data.orderId, userId: user.id! });
  if (existing) return { success: false, message: 'Вы уже откликнулись на этот заказ' };

  // determine credit cost
  let creditsSpent = 500;
  const userDoc = await usersCol.findOne({ _id: user.id } as any) as any;
  const plan = userDoc?.plan || 'Free';

  if (plan === 'PRO' || plan === 'Business' || plan === 'Enterprise') {
    const used = userDoc?.hubFreeResponsesUsed || 0;
    const resetAt = userDoc?.hubFreeResponsesResetAt ? new Date(userDoc.hubFreeResponsesResetAt) : null;
    const now = new Date();

    // monthly reset
    if (resetAt && now >= resetAt) {
      await usersCol.updateOne(
        { _id: user.id } as any,
        { $set: { hubFreeResponsesUsed: 0, hubFreeResponsesResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } },
      );
      creditsSpent = 0;
      await usersCol.updateOne({ _id: user.id } as any, { $set: { hubFreeResponsesUsed: 1 } });
    } else if (used < 3) {
      creditsSpent = 0;
      await usersCol.updateOne({ _id: user.id } as any, { $inc: { hubFreeResponsesUsed: 1 } });
      if (!resetAt) {
        await usersCol.updateOne(
          { _id: user.id } as any,
          { $set: { hubFreeResponsesResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } },
        );
      }
    }
  }

  // deduct credits if needed
  if (creditsSpent > 0) {
    // simplified credit check — in production use deductCredits from credits.ts
    const balance = userDoc?.credits || 0;
    if (balance < creditsSpent) {
      return { success: false, message: `Недостаточно кредитов. Нужно ${creditsSpent}₽, доступно ${balance}₽`, insufficientCredits: true };
    }
    await usersCol.updateOne({ _id: user.id } as any, { $inc: { credits: -creditsSpent } });
  }

  const response: HubResponse = {
    id: nanoid(12),
    orderId: data.orderId,
    userId: user.id!,
    userName: user.name || undefined,
    userAvatar: user.image || undefined,
    message: data.message,
    proposedPrice: data.proposedPrice,
    proposedDeadline: data.proposedDeadline,
    status: 'pending',
    creditsSpent,
    createdAt: new Date(),
  };

  await responsesCol.insertOne(response);
  await ordersCol.updateOne(
    { id: data.orderId },
    { $inc: { responseCount: 1 }, $set: { updatedAt: new Date() } },
  );

  const msg = creditsSpent > 0
    ? `Отклик отправлен. Списано ${creditsSpent}₽`
    : 'Отклик отправлен. Бесплатно (PRO)';

  return { success: true, message: msg, responseId: response.id };
}

export async function acceptHubResponse(responseId: string) {
  const user = await requireAuth();
  const responsesCol = await getResponsesCollection();
  const ordersCol = await getOrdersCollection();

  const response = await responsesCol.findOne({ id: responseId });
  if (!response) return { success: false, message: 'Отклик не найден' };

  const order = await ordersCol.findOne({ id: response.orderId });
  if (!order) return { success: false, message: 'Заказ не найден' };
  if (order.userId !== user.id) return { success: false, message: 'Нет доступа' };

  await responsesCol.updateOne({ id: responseId }, { $set: { status: 'accepted' } });
  await responsesCol.updateMany(
    { orderId: response.orderId, id: { $ne: responseId }, status: 'pending' },
    { $set: { status: 'rejected' } },
  );
  await ordersCol.updateOne(
    { id: response.orderId },
    { $set: { status: 'in_progress' as HubOrderStatus, updatedAt: new Date() } },
  );

  return { success: true, message: 'Исполнитель выбран' };
}

export async function rejectHubResponse(responseId: string) {
  const user = await requireAuth();
  const responsesCol = await getResponsesCollection();

  const response = await responsesCol.findOne({ id: responseId });
  if (!response) return { success: false, message: 'Отклик не найден' };

  const ordersCol = await getOrdersCollection();
  const order = await ordersCol.findOne({ id: response.orderId });
  if (!order || order.userId !== user.id) return { success: false, message: 'Нет доступа' };

  await responsesCol.updateOne({ id: responseId }, { $set: { status: 'rejected' } });
  return { success: true, message: 'Отклик отклонён' };
}

export async function submitHubReview(raw: z.infer<typeof submitReviewSchema>) {
  const user = await requireAuth();
  const parsed = submitReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Ошибка валидации' };
  }
  const data = parsed.data;

  const reviewsCol = await getReviewsCollection();

  // prevent duplicate review
  const existing = await reviewsCol.findOne({ orderId: data.orderId, fromUserId: user.id!, toUserId: data.toUserId });
  if (existing) return { success: false, message: 'Вы уже оставили отзыв' };

  const review: HubReview = {
    id: nanoid(12),
    orderId: data.orderId,
    fromUserId: user.id!,
    fromUserName: user.name || undefined,
    toUserId: data.toUserId,
    rating: data.rating,
    comment: data.comment,
    role: data.role,
    createdAt: new Date(),
  };

  await reviewsCol.insertOne(review);

  // update user average rating
  const allReviews = await reviewsCol.find({ toUserId: data.toUserId, role: data.role }).toArray();
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  const usersCol = await getUsersCollection();
  if (data.role === 'contractor') {
    await usersCol.updateOne({ _id: data.toUserId } as any, { $set: { contractorRating: Math.round(avgRating * 10) / 10, contractorReviewCount: allReviews.length } });
  } else {
    await usersCol.updateOne({ _id: data.toUserId } as any, { $set: { clientRating: Math.round(avgRating * 10) / 10, clientReviewCount: allReviews.length } });
  }

  return { success: true, message: 'Отзыв отправлен' };
}

export async function getHubOrders(filters: HubFilters = {}) {
  const col = await getOrdersCollection();
  const query: any = { status: 'open' };

  if (filters.city) query.city = { $regex: filters.city, $options: 'i' };
  if (filters.category) query.category = filters.category;
  if (filters.query) {
    query.$or = [
      { title: { $regex: filters.query, $options: 'i' } },
      { description: { $regex: filters.query, $options: 'i' } },
    ];
  }
  if (filters.budgetMin || filters.budgetMax) {
    query['budget.max'] = {};
    if (filters.budgetMin) query['budget.max'].$gte = filters.budgetMin;
    if (filters.budgetMax) query['budget.min'] = { $lte: filters.budgetMax };
  }

  let sort: any = { createdAt: -1 };
  if (filters.sortBy === 'budget_asc') sort = { 'budget.min': 1 };
  if (filters.sortBy === 'budget_desc') sort = { 'budget.max': -1 };
  if (filters.sortBy === 'deadline') sort = { deadline: 1 };

  const orders = await col.find(query).sort(sort).limit(50).toArray();
  return orders.map(o => ({ ...o, _id: undefined }));
}

export async function getHubOrderDetails(orderId: string) {
  const ordersCol = await getOrdersCollection();
  const responsesCol = await getResponsesCollection();
  const reviewsCol = await getReviewsCollection();

  const order = await ordersCol.findOne({ id: orderId });
  if (!order) return null;

  // increment view count
  await ordersCol.updateOne({ id: orderId }, { $inc: { viewCount: 1 } });

  const responses = await responsesCol.find({ orderId }).sort({ createdAt: -1 }).toArray();
  const reviews = await reviewsCol.find({ orderId }).toArray();

  // get author rating
  const usersCol = await getUsersCollection();
  const author = await usersCol.findOne({ _id: order.userId } as any) as any;

  return {
    order: { ...order, _id: undefined, userRating: author?.clientRating, },
    responses: responses.map(r => ({ ...r, _id: undefined })),
    reviews: reviews.map(r => ({ ...r, _id: undefined })),
  };
}

export async function getMyHubOrders() {
  const user = await requireAuth();
  const col = await getOrdersCollection();
  const orders = await col.find({ userId: user.id! }).sort({ createdAt: -1 }).toArray();
  return orders.map(o => ({ ...o, _id: undefined }));
}

export async function getMyHubResponses() {
  const user = await requireAuth();
  const col = await getResponsesCollection();
  const responses = await col.find({ userId: user.id! }).sort({ createdAt: -1 }).toArray();

  // enrich with order titles
  const ordersCol = await getOrdersCollection();
  const orderIds = [...new Set(responses.map(r => r.orderId))];
  const orders = await ordersCol.find({ id: { $in: orderIds } }).toArray();
  const orderMap = new Map(orders.map(o => [o.id, o.title]));

  return responses.map(r => ({
    ...r,
    _id: undefined,
    orderTitle: orderMap.get(r.orderId) || 'Заказ',
  }));
}

export async function getUserHubReviews(userId: string) {
  const reviewsCol = await getReviewsCollection();
  const reviews = await reviewsCol.find({ toUserId: userId }).sort({ createdAt: -1 }).limit(20).toArray();
  return reviews.map(r => ({ ...r, _id: undefined }));
}
