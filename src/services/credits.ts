// src/services/credits.ts
// Server-only credit ledger + lots service
import { nanoid } from 'nanoid';
import { getClient, getDb } from '../lib/mongodb';

export type CreditLotType = 'bonus' | 'purchased';
export type CreditLedgerType = 'grant' | 'debit' | 'refund' | 'expire';

export type CreditSummary = {
  total: number;
  bonus: number;
  purchased: number;
  bonusExpiresAt: Date | null;
  purchasedExpiresAt: Date | null;
};

export type TransactionContext = {
  db: any;
  session?: any;
};

const DEFAULT_BONUS_DAYS = 30;
const DEFAULT_PURCHASED_DAYS = 365;

const isTransactionUnsupported = (error: any) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  return error?.code === 20 || message.includes('Transaction numbers are only allowed');
};

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

const withSession = (session?: any) => (session ? { session } : undefined);

async function ensureLotsFromUserDoc(ctx: TransactionContext, userId: string) {
  const existingLots = await ctx.db
    .collection('credit_lots')
    .countDocuments({ userId }, withSession(ctx.session));
  if (existingLots > 0) return;

  const user = await ctx.db.collection('users').findOne({ _id: userId }, withSession(ctx.session));
  if (!user) return;

  const legacyBonus = user.bonusCredits ?? user.promoCredits ?? 0;
  const total = user.credits ?? 0;
  const purchased = Math.max(total - legacyBonus, 0);
  if (legacyBonus <= 0 && purchased <= 0) return;

  const now = new Date();
  const docs: any[] = [];
  if (legacyBonus > 0) {
    docs.push({
      _id: nanoid(),
      userId,
      type: 'bonus',
      amount: legacyBonus,
      remaining: legacyBonus,
      expiresAt: user.bonusCreditsExpireAt || user.promoCreditsExpireAt || addDays(now, DEFAULT_BONUS_DAYS),
      source: 'legacy',
      createdAt: now,
      metadata: { legacy: true },
    });
  }
  if (purchased > 0) {
    docs.push({
      _id: nanoid(),
      userId,
      type: 'purchased',
      amount: purchased,
      remaining: purchased,
      expiresAt: user.purchasedCreditsExpireAt || addDays(now, DEFAULT_PURCHASED_DAYS),
      source: 'legacy',
      createdAt: now,
      metadata: { legacy: true },
    });
  }
  if (docs.length) {
    await ctx.db.collection('credit_lots').insertMany(docs, withSession(ctx.session));
  }
}

export async function withMongoTransaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error('Missing MONGODB_DB in environment.');
  }
  const db = client.db(dbName);
  const session = client.startSession();

  const runWithoutTransaction = async () => fn({ db, session: undefined });

  try {
    return await session.withTransaction(async () => fn({ db, session }));
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return await runWithoutTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function updateUserCreditSummaryInTransaction(ctx: TransactionContext, userId: string): Promise<CreditSummary> {
  await ensureLotsFromUserDoc(ctx, userId);
  const lots = await ctx.db
    .collection('credit_lots')
    .find({ userId, remaining: { $gt: 0 } }, withSession(ctx.session))
    .toArray();

  const bonusLots = lots.filter((lot: any) => lot.type === 'bonus');
  const purchasedLots = lots.filter((lot: any) => lot.type === 'purchased');

  const sumRemaining = (items: any[]) => items.reduce((acc, item) => acc + (item.remaining || 0), 0);
  const minExpiry = (items: any[]) => {
    const dates = items
      .map((item) => item.expiresAt)
      .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()));
    if (!dates.length) return null;
    return dates.sort((a, b) => a.getTime() - b.getTime())[0];
  };

  const bonus = sumRemaining(bonusLots);
  const purchased = sumRemaining(purchasedLots);
  const summary: CreditSummary = {
    total: bonus + purchased,
    bonus,
    purchased,
    bonusExpiresAt: minExpiry(bonusLots),
    purchasedExpiresAt: minExpiry(purchasedLots),
  };

  await ctx.db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        credits: summary.total,
        bonusCredits: summary.bonus,
        purchasedCredits: summary.purchased,
        bonusCreditsExpireAt: summary.bonusExpiresAt,
        purchasedCreditsExpireAt: summary.purchasedExpiresAt,
        creditsUpdatedAt: new Date(),
      },
    },
    withSession(ctx.session),
  );

  return summary;
}

export async function expireCreditsForUserInTransaction(ctx: TransactionContext, userId: string) {
  await ensureLotsFromUserDoc(ctx, userId);
  const now = new Date();
  const expiredLots = await ctx.db
    .collection('credit_lots')
    .find({ userId, remaining: { $gt: 0 }, expiresAt: { $lte: now } }, withSession(ctx.session))
    .toArray();

  if (!expiredLots.length) {
    return { expired: 0 };
  }

  const ledgerEntries = [] as any[];
  for (const lot of expiredLots) {
    const remaining = lot.remaining || 0;
    if (remaining <= 0) continue;
    await ctx.db.collection('credit_lots').updateOne(
      { _id: lot._id },
      { $set: { remaining: 0, expiredAt: now } },
      withSession(ctx.session),
    );
    ledgerEntries.push({
      _id: nanoid(),
      userId,
      type: 'expire' as CreditLedgerType,
      amount: remaining,
      lotId: lot._id,
      reason: 'expired',
      createdAt: now,
      metadata: { lotType: lot.type, expiresAt: lot.expiresAt },
    });
  }

  if (ledgerEntries.length) {
    await ctx.db.collection('credit_ledger').insertMany(ledgerEntries, withSession(ctx.session));
  }

  await updateUserCreditSummaryInTransaction(ctx, userId);
  return { expired: ledgerEntries.reduce((acc, entry) => acc + entry.amount, 0) };
}

export async function expireCreditsForUser(userId: string) {
  return withMongoTransaction(async (ctx) => expireCreditsForUserInTransaction(ctx, userId));
}

export async function getCreditSummary(userId: string, options: { refresh?: boolean } = {}) {
  if (options.refresh) {
    return withMongoTransaction(async (ctx) => {
      await expireCreditsForUserInTransaction(ctx, userId);
      return updateUserCreditSummaryInTransaction(ctx, userId);
    });
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId });
  return {
    total: user?.credits || 0,
    bonus: user?.bonusCredits || 0,
    purchased: user?.purchasedCredits || 0,
    bonusExpiresAt: user?.bonusCreditsExpireAt || null,
    purchasedExpiresAt: user?.purchasedCreditsExpireAt || null,
  } as CreditSummary;
}

export async function grantCredits(params: {
  userId: string;
  amount: number;
  type: CreditLotType;
  expiresAt?: Date | null;
  source?: string;
  metadata?: Record<string, any>;
}) {
  const { userId, amount, type, expiresAt, source, metadata } = params;
  if (!userId) throw new Error('User ID is required.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive.');

  return withMongoTransaction(async (ctx) => {
    return grantCreditsInTransaction(ctx, params);
  });
}

export async function grantCreditsInTransaction(
  ctx: TransactionContext,
  params: {
    userId: string;
    amount: number;
    type: CreditLotType;
    expiresAt?: Date | null;
    source?: string;
    metadata?: Record<string, any>;
  },
) {
  const { userId, amount, type, expiresAt, source, metadata } = params;
  const now = new Date();
  const finalExpiry = expiresAt ?? (type === 'bonus' ? addDays(now, DEFAULT_BONUS_DAYS) : addDays(now, DEFAULT_PURCHASED_DAYS));
  const lotId = nanoid();
  await ctx.db.collection('credit_lots').insertOne(
    {
      _id: lotId,
      userId,
      type,
      amount,
      remaining: amount,
      expiresAt: finalExpiry,
      source: source || 'manual',
      createdAt: now,
      metadata: metadata || {},
    },
    withSession(ctx.session),
  );

  await ctx.db.collection('credit_ledger').insertOne(
    {
      _id: nanoid(),
      userId,
      type: 'grant' as CreditLedgerType,
      amount,
      lotId,
      reason: source || 'grant',
      createdAt: now,
      metadata: { lotType: type, ...metadata },
    },
    withSession(ctx.session),
  );

  const summary = await updateUserCreditSummaryInTransaction(ctx, userId);
  return { lotId, summary };
}

export async function deductCredits(params: {
  userId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, any>;
}) {
  const { userId, amount, reason, metadata } = params;
  if (!userId) throw new Error('User ID is required.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive.');

  return withMongoTransaction(async (ctx) => {
    return deductCreditsInTransaction(ctx, params);
  });
}

export async function deductCreditsInTransaction(
  ctx: TransactionContext,
  params: {
    userId: string;
    amount: number;
    reason?: string;
    metadata?: Record<string, any>;
  },
) {
  const { userId, amount, reason, metadata } = params;
  await ensureLotsFromUserDoc(ctx, userId);
  await expireCreditsForUserInTransaction(ctx, userId);

  const bonusLots = await ctx.db
    .collection('credit_lots')
    .find({ userId, type: 'bonus', remaining: { $gt: 0 } }, withSession(ctx.session))
    .sort({ expiresAt: 1, createdAt: 1 })
    .toArray();
  const purchasedLots = await ctx.db
    .collection('credit_lots')
    .find({ userId, type: 'purchased', remaining: { $gt: 0 } }, withSession(ctx.session))
    .sort({ createdAt: 1 })
    .toArray();

  let remainingToDeduct = amount;
  const ledgerEntries: any[] = [];
  const now = new Date();

  const processLot = async (lot: any) => {
    if (remainingToDeduct <= 0) return;
    const available = lot.remaining || 0;
    if (available <= 0) return;
    const used = Math.min(available, remainingToDeduct);
    remainingToDeduct -= used;
    await ctx.db.collection('credit_lots').updateOne(
      { _id: lot._id },
      { $set: { remaining: available - used } },
      withSession(ctx.session),
    );
    ledgerEntries.push({
      _id: nanoid(),
      userId,
      type: 'debit' as CreditLedgerType,
      amount: used,
      lotId: lot._id,
      reason: reason || 'debit',
      createdAt: now,
      metadata: { lotType: lot.type, ...metadata },
    });
  };

  for (const lot of bonusLots) {
    await processLot(lot);
    if (remainingToDeduct <= 0) break;
  }
  if (remainingToDeduct > 0) {
    for (const lot of purchasedLots) {
      await processLot(lot);
      if (remainingToDeduct <= 0) break;
    }
  }

  if (remainingToDeduct > 0) {
    throw new Error('Недостаточно кредитов.');
  }

  if (ledgerEntries.length) {
    await ctx.db.collection('credit_ledger').insertMany(ledgerEntries, withSession(ctx.session));
  }

  const summary = await updateUserCreditSummaryInTransaction(ctx, userId);
  return { summary, debits: ledgerEntries };
}

export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason?: string;
  originalDebitId?: string;
  metadata?: Record<string, any>;
}) {
  const { userId, amount, reason, originalDebitId, metadata } = params;
  if (!userId) throw new Error('User ID is required.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive.');

  return withMongoTransaction(async (ctx) => {
    return refundCreditsInTransaction(ctx, params);
  });
}

export async function refundCreditsInTransaction(
  ctx: TransactionContext,
  params: {
    userId: string;
    amount: number;
    reason?: string;
    originalDebitId?: string;
    metadata?: Record<string, any>;
  },
) {
  const { userId, amount, reason, originalDebitId, metadata } = params;
  const now = new Date();
  let targetLot: any = null;
  let targetType: CreditLotType = 'purchased';

  if (originalDebitId) {
    const originalDebit = await ctx.db
      .collection('credit_ledger')
      .findOne({ _id: originalDebitId, userId, type: 'debit' }, withSession(ctx.session));
    if (originalDebit?.lotId) {
      const lot = await ctx.db
        .collection('credit_lots')
        .findOne({ _id: originalDebit.lotId }, withSession(ctx.session));
      if (lot && (!lot.expiresAt || lot.expiresAt > now)) {
        targetLot = lot;
        targetType = lot.type || 'purchased';
      }
    }
  }

  let lotId = targetLot?._id;
  if (targetLot) {
    await ctx.db.collection('credit_lots').updateOne(
      { _id: lotId },
      { $inc: { remaining: amount }, $set: { updatedAt: now } },
      withSession(ctx.session),
    );
  } else {
    const expiresAt = targetType === 'bonus' ? addDays(now, DEFAULT_BONUS_DAYS) : addDays(now, DEFAULT_PURCHASED_DAYS);
    lotId = nanoid();
    await ctx.db.collection('credit_lots').insertOne(
      {
        _id: lotId,
        userId,
        type: targetType,
        amount,
        remaining: amount,
        expiresAt,
        source: 'refund',
        createdAt: now,
        metadata: metadata || {},
      },
      withSession(ctx.session),
    );
  }

  await ctx.db.collection('credit_ledger').insertOne(
    {
      _id: nanoid(),
      userId,
      type: 'refund' as CreditLedgerType,
      amount,
      lotId,
      reason: reason || 'refund',
      createdAt: now,
      metadata: { ...metadata, originalDebitId: originalDebitId || null },
    },
    withSession(ctx.session),
  );

  const summary = await updateUserCreditSummaryInTransaction(ctx, userId);
  return { lotId, summary };
}

export async function getCreditHistory(userId: string, limit: number = 50) {
  const db = await getDb();
  return db
    .collection('credit_ledger')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
