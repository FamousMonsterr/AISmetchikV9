// src/actions/creditActions.ts
'use server';

import { z } from 'zod';
import { getDb } from '@/lib/mongodb';
import { getCreditHistory } from '@/services/credits';

const CreditHistorySchema = z.object({
  currentUserId: z.string().min(1),
  targetUserId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
});

export type CreditHistoryEntry = {
  id: string;
  type: 'grant' | 'debit' | 'refund' | 'expire';
  amount: number;
  lotId?: string | null;
  reason?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
};

async function isAdmin(userId: string): Promise<boolean> {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) return false;
  return user.systemRole === 'Admin' || user.systemRole === 'Super Admin';
}

export async function getCreditHistoryForUser(data: z.infer<typeof CreditHistorySchema>): Promise<{ success: boolean; entries: CreditHistoryEntry[]; message?: string }> {
  const validation = CreditHistorySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, entries: [], message: 'Неверные данные для истории кредитов.' };
  }

  const { currentUserId, targetUserId, limit } = validation.data;
  if (currentUserId !== targetUserId) {
    const admin = await isAdmin(currentUserId);
    if (!admin) {
      return { success: false, entries: [], message: 'Недостаточно прав для просмотра истории.' };
    }
  }

  const docs = await getCreditHistory(targetUserId, limit ?? 50);
  const entries = docs.map((doc: any) => ({
    id: doc._id,
    type: doc.type,
    amount: doc.amount,
    lotId: doc.lotId || null,
    reason: doc.reason || null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    metadata: doc.metadata || {},
  }));

  return { success: true, entries };
}
