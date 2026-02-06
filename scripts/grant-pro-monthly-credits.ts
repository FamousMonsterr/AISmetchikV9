// scripts/grant-pro-monthly-credits.ts
import 'dotenv/config';
import { getDb } from '../src/lib/mongodb';
import { grantCredits } from '../src/services/credits';

const MONTHLY_BONUS = 10;

const getPeriodKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isSamePeriod = (date: Date | null, periodKey: string) => {
  if (!date) return false;
  return getPeriodKey(date) === periodKey;
};

const normalizeDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function run() {
  const db = await getDb();
  const now = new Date();
  const periodKey = getPeriodKey(now);

  const users = await db
    .collection('users')
    .find({
      plan: 'PRO',
      planSource: { $nin: ['trial', 'pending_payment'] },
      agreedToMarketing: true,
      $or: [{ planExpiresAt: null }, { planExpiresAt: { $gt: now } }],
    })
    .toArray();

  let granted = 0;
  for (const user of users) {
    const lastGrantedAt = normalizeDate(user.proMonthlyBonusLastGrantedAt);
    if (isSamePeriod(lastGrantedAt, periodKey)) continue;

    await grantCredits({
      userId: user._id,
      amount: MONTHLY_BONUS,
      type: 'bonus',
      source: 'pro_monthly_bonus',
      metadata: { period: periodKey },
    });

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { proMonthlyBonusLastGrantedAt: now } },
    );

    granted += 1;
  }

  console.log(`PRO monthly credits granted: ${granted}`);
}

run().catch((error) => {
  console.error('Monthly PRO credits failed:', error);
  process.exit(1);
});
