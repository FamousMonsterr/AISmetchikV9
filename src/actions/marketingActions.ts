'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from '@/lib/mongoFirestoreServer';
import { grantCredits } from '@/services/credits';

const BONUS_CREDITS = 10;
const BONUS_DAYS = 30;

const GrantSchema = z.object({
  userId: z.string().min(1),
  source: z.string().optional(),
});

const BatchSchema = z.object({
  limit: z.number().int().positive().optional(),
});

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

const normalizeDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isPlanEligible = (plan?: string | null) => plan === 'Free' || plan === 'PRO';

export async function grantMarketingBonusForUser(data: z.infer<typeof GrantSchema>) {
  const validation = GrantSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { userId, source } = validation.data;

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    return { success: false, message: 'Пользователь не найден.' };
  }
  const user = userSnap.data() as any;
  if (!user?.agreedToMarketing || !isPlanEligible(user?.plan)) {
    return { success: false, message: 'Пользователь не участвует в бонусной рассылке.' };
  }

  const lastGrantedAt = normalizeDate(user.marketingBonusLastGrantedAt || user.proMonthlyBonusLastGrantedAt);
  if (lastGrantedAt && lastGrantedAt > addDays(new Date(), -BONUS_DAYS)) {
    return { success: false, message: 'Бонус уже начислен в этом периоде.' };
  }

  await grantCredits({
    userId,
    amount: BONUS_CREDITS,
    type: 'bonus',
    source: source || 'marketing_bonus',
    metadata: { periodDays: BONUS_DAYS },
  });

  await updateDoc(userRef, {
    marketingBonusLastGrantedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, message: 'Бонусные кредиты начислены.' };
}

export async function grantMonthlyMarketingBonuses(data: z.infer<typeof BatchSchema> = {}) {
  const validation = BatchSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, processed: 0, message: 'Неверные данные.' };
  }

  const limitCount = validation.data.limit || 200;
  const usersQuery = query(
    collection(db, 'users'),
    where('agreedToMarketing', '==', true),
  );

  const snapshot = await getDocs(usersQuery);
  const candidates = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((user: any) => isPlanEligible(user?.plan))
    .slice(0, limitCount);

  let processed = 0;
  for (const user of candidates) {
    const result = await grantMarketingBonusForUser({ userId: user.id, source: 'marketing_bonus_cron' });
    if (result.success) {
      processed += 1;
    }
  }

  return { success: true, processed };
}
