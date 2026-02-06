// scripts/auto-approve-pro-payments.ts
import 'dotenv/config';
import { addMonths } from 'date-fns';
import { nanoid } from 'nanoid';
import { getDb } from '../src/lib/mongodb';

const LIFETIME_MONTHS = 24;

const normalizeDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function buildPlanExpiry(now: Date, months: number, isLifetime: boolean, existingExpiresAt: Date | null) {
  if (isLifetime) return null;
  const base = existingExpiresAt && existingExpiresAt > now ? existingExpiresAt : now;
  return addMonths(base, months);
}

async function run() {
  const db = await getDb();
  const now = new Date();
  const orders = await db
    .collection('pro_subscription_orders')
    .find({ status: 'pending', autoApproveAt: { $lte: now } })
    .limit(200)
    .toArray();

  let processed = 0;
  for (const order of orders) {
    const user = await db.collection('users').findOne({ _id: order.userId });
    if (!user) continue;

    const currentExpiresAt = normalizeDate(user.planExpiresAt);
    const isLifetime = order.isLifetime || order.planMonths === LIFETIME_MONTHS;
    const newExpiresAt = buildPlanExpiry(now, order.planMonths, isLifetime, currentExpiresAt);

    await db.collection('users').updateOne(
      { _id: order.userId },
      {
        $set: {
          plan: 'PRO',
          planSource: 'paid',
          planExpiresAt: newExpiresAt,
          originalPlan: user.originalPlan || (user.plan === 'PRO' ? 'Free' : user.plan || 'Free'),
          pendingProOrderId: null,
          pendingProExpiresAt: null,
          updatedAt: now,
        },
      },
    );

    await db.collection('pro_subscription_orders').updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'auto_approved',
          approvedAt: now,
          updatedAt: now,
        },
      },
    );

    await db.collection('user_notifications').insertOne({
      _id: nanoid(),
      userId: order.userId,
      title: 'Подписка PRO подтверждена',
      content: isLifetime
        ? 'Оплата подтверждена автоматически. Вам активирован пожизненный PRO.'
        : `Оплата подтверждена автоматически. Подписка PRO активирована до ${newExpiresAt?.toLocaleDateString('ru-RU')}.`,
      type: 'informational',
      status: 'unread',
      createdAt: now,
      metadata: { orderId: order._id, autoApproved: true },
    });

    processed += 1;
  }

  console.log(`Auto-approve complete. Orders processed: ${processed}`);
}

run().catch((error) => {
  console.error('Auto-approve failed:', error);
  process.exit(1);
});
