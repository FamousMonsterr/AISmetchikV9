import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(),
  getClient: vi.fn(),
}));

import {
  grantCreditsInTransaction,
  deductCreditsInTransaction,
  expireCreditsForUserInTransaction,
  refundCreditsInTransaction,
  updateUserCreditSummaryInTransaction,
  type TransactionContext,
} from '@/services/credits';

type Filter = Record<string, any>;

const normalizeValue = (value: any) => (value instanceof Date ? value.getTime() : value);

function matches(doc: any, filter: Filter): boolean {
  for (const [key, condition] of Object.entries(filter || {})) {
    const value = doc[key];
    if (condition && typeof condition === 'object' && !(condition instanceof Date) && !Array.isArray(condition)) {
      if ('$gt' in condition) {
        if (!(normalizeValue(value) > normalizeValue(condition.$gt))) return false;
        continue;
      }
      if ('$gte' in condition) {
        if (!(normalizeValue(value) >= normalizeValue(condition.$gte))) return false;
        continue;
      }
      if ('$lt' in condition) {
        if (!(normalizeValue(value) < normalizeValue(condition.$lt))) return false;
        continue;
      }
      if ('$lte' in condition) {
        if (!(normalizeValue(value) <= normalizeValue(condition.$lte))) return false;
        continue;
      }
      if ('$in' in condition) {
        if (!Array.isArray(condition.$in) || !condition.$in.includes(value)) return false;
        continue;
      }
    }
    if (value !== condition) return false;
  }
  return true;
}

class MemoryCursor {
  private items: any[];
  private sortSpec?: Record<string, 1 | -1>;

  constructor(items: any[]) {
    this.items = items;
  }

  sort(spec: Record<string, 1 | -1>) {
    this.sortSpec = spec;
    return this;
  }

  async toArray() {
    if (!this.sortSpec) return [...this.items];
    const [field, direction] = Object.entries(this.sortSpec)[0];
    const multiplier = direction === -1 ? -1 : 1;
    return [...this.items].sort((a, b) => {
      const av = normalizeValue(a[field]);
      const bv = normalizeValue(b[field]);
      if (av === bv) return 0;
      return av > bv ? multiplier : -multiplier;
    });
  }
}

class MemoryCollection {
  private docs: any[] = [];

  async countDocuments(filter: Filter) {
    return this.docs.filter((doc) => matches(doc, filter)).length;
  }

  find(filter: Filter = {}) {
    const items = this.docs.filter((doc) => matches(doc, filter));
    return new MemoryCursor(items);
  }

  async findOne(filter: Filter) {
    return this.docs.find((doc) => matches(doc, filter)) || null;
  }

  async insertOne(doc: any) {
    this.docs.push({ ...doc });
    return { insertedId: doc._id };
  }

  async insertMany(docs: any[]) {
    docs.forEach((doc) => this.docs.push({ ...doc }));
    return { insertedCount: docs.length };
  }

  async updateOne(filter: Filter, update: any) {
    const doc = this.docs.find((item) => matches(item, filter));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        doc[key] = (doc[key] || 0) + (value as number);
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

class MemoryDb {
  private collections = new Map<string, MemoryCollection>();

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection());
    }
    return this.collections.get(name)!;
  }
}

const createContext = () => {
  const db = new MemoryDb();
  const ctx: TransactionContext = { db, session: undefined };
  return { db, ctx };
};

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

describe('credits service', () => {
  let ctx: TransactionContext;
  let db: MemoryDb;

  beforeEach(() => {
    const setup = createContext();
    db = setup.db;
    ctx = setup.ctx;
  });

  it('grants credits and updates summary', async () => {
    await db.collection('users').insertOne({ _id: 'u1', credits: 0 });
    const result = await grantCreditsInTransaction(ctx, { userId: 'u1', amount: 10, type: 'bonus', source: 'test' });
    const user = await db.collection('users').findOne({ _id: 'u1' });
    const lots = await db.collection('credit_lots').find({ userId: 'u1' }).toArray();
    const ledger = await db.collection('credit_ledger').find({ userId: 'u1' }).toArray();

    expect(result.lotId).toBeTruthy();
    expect(user?.credits).toBe(10);
    expect(user?.bonusCredits).toBe(10);
    expect(lots).toHaveLength(1);
    expect(ledger).toHaveLength(1);
  });

  it('deducts bonus first, then purchased FIFO', async () => {
    await db.collection('users').insertOne({ _id: 'u1', credits: 0 });
    const now = new Date();
    await db.collection('credit_lots').insertMany([
      { _id: 'bonus', userId: 'u1', type: 'bonus', amount: 5, remaining: 5, expiresAt: addDays(now, 10), createdAt: new Date(now.getTime() - 1000) },
      { _id: 'p1', userId: 'u1', type: 'purchased', amount: 10, remaining: 10, expiresAt: addDays(now, 200), createdAt: new Date(now.getTime() - 5000) },
      { _id: 'p2', userId: 'u1', type: 'purchased', amount: 10, remaining: 10, expiresAt: addDays(now, 300), createdAt: new Date(now.getTime() - 1000) },
    ]);

    await updateUserCreditSummaryInTransaction(ctx, 'u1');
    await deductCreditsInTransaction(ctx, { userId: 'u1', amount: 12, reason: 'test' });

    const bonusLot = await db.collection('credit_lots').findOne({ _id: 'bonus' });
    const firstPurchased = await db.collection('credit_lots').findOne({ _id: 'p1' });
    const secondPurchased = await db.collection('credit_lots').findOne({ _id: 'p2' });

    expect(bonusLot?.remaining).toBe(0);
    expect(firstPurchased?.remaining).toBe(3);
    expect(secondPurchased?.remaining).toBe(10);
  });

  it('expires credits and logs ledger entries', async () => {
    await db.collection('users').insertOne({ _id: 'u1', credits: 0 });
    const now = new Date();
    await db.collection('credit_lots').insertMany([
      { _id: 'expired', userId: 'u1', type: 'bonus', amount: 5, remaining: 5, expiresAt: addDays(now, -1), createdAt: new Date(now.getTime() - 1000) },
      { _id: 'active', userId: 'u1', type: 'purchased', amount: 8, remaining: 8, expiresAt: addDays(now, 30), createdAt: new Date(now.getTime() - 500) },
    ]);

    const result = await expireCreditsForUserInTransaction(ctx, 'u1');
    const expiredLot = await db.collection('credit_lots').findOne({ _id: 'expired' });
    const ledger = await db.collection('credit_ledger').find({ userId: 'u1', type: 'expire' }).toArray();

    expect(result.expired).toBe(5);
    expect(expiredLot?.remaining).toBe(0);
    expect(ledger).toHaveLength(1);
  });

  it('refunds to original lot when possible', async () => {
    await db.collection('users').insertOne({ _id: 'u1', credits: 0 });
    const now = new Date();
    await db.collection('credit_lots').insertOne({
      _id: 'lot1',
      userId: 'u1',
      type: 'purchased',
      amount: 10,
      remaining: 3,
      expiresAt: addDays(now, 365),
      createdAt: now,
    });
    await db.collection('credit_ledger').insertOne({
      _id: 'debit1',
      userId: 'u1',
      type: 'debit',
      amount: 2,
      lotId: 'lot1',
      reason: 'test',
      createdAt: now,
    });

    await refundCreditsInTransaction(ctx, { userId: 'u1', amount: 2, originalDebitId: 'debit1', reason: 'refund' });
    const lot = await db.collection('credit_lots').findOne({ _id: 'lot1' });

    expect(lot?.remaining).toBe(5);
  });
});
