// @ts-nocheck
import { nanoid } from 'nanoid';
import { getClient, getDb, getDbForCollection } from '@/lib/mongodb';

export type DocumentData = Record<string, any>;

export class DbServerError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export { DbServerError as FirebaseError };

export class Timestamp {
  private readonly value: Date;
  constructor(seconds: number, nanoseconds: number) {
    this.value = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
  }
  toDate() {
    return this.value;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
}

type CollectionRef = { name: string };
type DocRef = { collection: string; id: string };
type WhereFilter = { type: 'where'; field: string; op: string; value: any };
type OrderByClause = { type: 'orderBy'; field: string; direction: 'asc' | 'desc' };
type LimitClause = { type: 'limit'; count: number };
type QueryRef = {
  type: 'query';
  collection: string;
  filters: WhereFilter[];
  orderBy: OrderByClause[];
  limit?: number;
};

type WriteBatchOp =
  | { type: 'set'; ref: DocRef; data: DocumentData; options?: { merge?: boolean } }
  | { type: 'update'; ref: DocRef; data: DocumentData }
  | { type: 'delete'; ref: DocRef };

export function collection(_db: unknown, name: string): CollectionRef {
  return { name };
}

export function doc(collectionOrDb: CollectionRef | unknown, nameOrId?: string, id?: string): DocRef {
  if (typeof (collectionOrDb as CollectionRef)?.name === 'string') {
    const collectionName = (collectionOrDb as CollectionRef).name;
    const docId = nameOrId ?? nanoid();
    return { collection: collectionName, id: docId };
  }
  if (!nameOrId) {
    throw new Error('Collection name is required.');
  }
  const docId = id ?? nanoid();
  return { collection: nameOrId, id: docId };
}

export function where(field: string, op: string, value: any): WhereFilter {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): OrderByClause {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): LimitClause {
  return { type: 'limit', count };
}

export function query(collectionRef: CollectionRef, ...clauses: Array<WhereFilter | OrderByClause | LimitClause>): QueryRef {
  const filters: WhereFilter[] = [];
  const orderByClauses: OrderByClause[] = [];
  let limitValue: number | undefined;

  clauses.forEach((clause) => {
    if (clause.type === 'where') {
      filters.push(clause);
    } else if (clause.type === 'orderBy') {
      orderByClauses.push(clause);
    } else if (clause.type === 'limit') {
      limitValue = clause.count;
    }
  });

  return {
    type: 'query',
    collection: collectionRef.name,
    filters,
    orderBy: orderByClauses,
    limit: limitValue,
  };
}

export function serverTimestamp() {
  return new Date();
}

export function increment(value: number) {
  return { __op: 'increment', value };
}

export function arrayUnion(...values: any[]) {
  return { __op: 'arrayUnion', values };
}

function normalizeValue(value: any) {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
}

function stripInternalId(doc: DocumentData) {
  const { _id, ...rest } = doc;
  return rest;
}

function buildMongoFilter(filters: WhereFilter[]) {
  const mongoFilter: Record<string, any> = {};
  for (const filter of filters) {
    const value = normalizeValue(filter.value);
    switch (filter.op) {
      case '==':
        mongoFilter[filter.field] = value;
        break;
      case '!=':
        mongoFilter[filter.field] = { $ne: value };
        break;
      case '>':
        mongoFilter[filter.field] = { $gt: value };
        break;
      case '>=':
        mongoFilter[filter.field] = { $gte: value };
        break;
      case '<':
        mongoFilter[filter.field] = { $lt: value };
        break;
      case '<=':
        mongoFilter[filter.field] = { $lte: value };
        break;
      case 'in':
        mongoFilter[filter.field] = { $in: value };
        break;
      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }
  return mongoFilter;
}

function splitUpdateOps(data: DocumentData) {
  const set: Record<string, any> = {};
  const inc: Record<string, number> = {};
  const addToSet: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.__op === 'increment') {
      inc[key] = value.value;
      return;
    }
    if (value && typeof value === 'object' && value.__op === 'arrayUnion') {
      addToSet[key] = { $each: value.values };
      return;
    }
    set[key] = normalizeValue(value);
  });

  const update: Record<string, any> = {};
  if (Object.keys(set).length) {
    update.$set = set;
  }
  if (Object.keys(inc).length) {
    update.$inc = inc;
  }
  if (Object.keys(addToSet).length) {
    update.$addToSet = addToSet;
  }

  return update;
}

function createDocSnapshot(doc: DocumentData | null, collectionName?: string) {
  const exists = !!doc;
  return {
    id: doc?._id ?? null,
    ref: doc && collectionName ? { collection: collectionName, id: doc._id } : undefined,
    exists: () => exists,
    data: () => (doc ? stripInternalId(doc) : undefined),
  };
}

function createQuerySnapshot(docs: DocumentData[], collectionName?: string) {
  const docSnapshots = docs.map((doc) => ({
    id: doc._id,
    ref: collectionName ? { collection: collectionName, id: doc._id } : undefined,
    data: () => stripInternalId(doc),
  }));
  return {
    docs: docSnapshots,
    size: docSnapshots.length,
    empty: docSnapshots.length === 0,
    forEach: (callback: (doc: any) => void) => {
      docSnapshots.forEach(callback);
    },
  };
}

async function executeQuery(queryRef: QueryRef) {
  const db = await getDbForCollection(queryRef.collection);
  const filter = buildMongoFilter(queryRef.filters);
  const cursor = db.collection(queryRef.collection).find(filter);
  if (queryRef.orderBy.length) {
    const sort: Record<string, 1 | -1> = {};
    queryRef.orderBy.forEach((clause) => {
      sort[clause.field] = clause.direction === 'desc' ? -1 : 1;
    });
    cursor.sort(sort);
  }
  if (queryRef.limit) {
    cursor.limit(queryRef.limit);
  }
  const docs = await cursor.toArray();
  return createQuerySnapshot(docs, queryRef.collection);
}

async function executeDocFetch(docRef: DocRef) {
  const db = await getDbForCollection(docRef.collection);
  const doc = await db.collection(docRef.collection).findOne({ _id: docRef.id });
  return createDocSnapshot(doc, docRef.collection);
}

export async function getDoc(ref: DocRef) {
  return executeDocFetch(ref);
}

export async function getDocs(ref: QueryRef | CollectionRef) {
  if ((ref as QueryRef).type === 'query') {
    return executeQuery(ref as QueryRef);
  }
  const queryRef = query(ref as CollectionRef);
  return executeQuery(queryRef);
}

export async function addDoc(ref: CollectionRef, data: DocumentData) {
  const db = await getDbForCollection(ref.name);
  const docId = nanoid();
  await db.collection(ref.name).insertOne({ _id: docId, ...data });
  return { id: docId };
}

export async function setDoc(ref: DocRef, data: DocumentData, options?: { merge?: boolean }) {
  const db = await getDbForCollection(ref.collection);
  if (options?.merge) {
    const update = splitUpdateOps(data);
    await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { upsert: true });
    return;
  }
  await db.collection(ref.collection).replaceOne({ _id: ref.id }, { _id: ref.id, ...data }, { upsert: true });
}

export async function updateDoc(ref: DocRef, data: DocumentData) {
  const db = await getDbForCollection(ref.collection);
  const update = splitUpdateOps(data);
  await db.collection(ref.collection).updateOne({ _id: ref.id }, update);
}

export async function deleteDoc(ref: DocRef) {
  const db = await getDbForCollection(ref.collection);
  await db.collection(ref.collection).deleteOne({ _id: ref.id });
}

export async function runTransaction<T>(_db: unknown, fn: (transaction: any) => Promise<T>) {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error('Missing MONGODB_DB in environment.');
  }
  const db = client.db(dbName);
  const session = client.startSession();
  const runWithoutTransaction = async () => {
    const transaction = {
      get: async (ref: DocRef) => {
        const doc = await db.collection(ref.collection).findOne({ _id: ref.id });
        return createDocSnapshot(doc, ref.collection);
      },
      update: async (ref: DocRef, data: DocumentData) => {
        const update = splitUpdateOps(data);
        await db.collection(ref.collection).updateOne({ _id: ref.id }, update);
      },
      set: async (ref: DocRef, data: DocumentData, options?: { merge?: boolean }) => {
        if (options?.merge) {
          const update = splitUpdateOps(data);
          await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { upsert: true });
          return;
        }
        await db.collection(ref.collection).replaceOne({ _id: ref.id }, { _id: ref.id, ...data }, { upsert: true });
      },
      delete: async (ref: DocRef) => {
        await db.collection(ref.collection).deleteOne({ _id: ref.id });
      },
    };
    return fn(transaction);
  };
  const isTransactionUnsupported = (error: any) => {
    const message = typeof error?.message === 'string' ? error.message : '';
    return error?.code === 20 || message.includes('Transaction numbers are only allowed');
  };
  try {
    return await session.withTransaction(async () => {
      const transaction = {
        get: async (ref: DocRef) => {
          const doc = await db.collection(ref.collection).findOne({ _id: ref.id }, { session });
          return createDocSnapshot(doc, ref.collection);
        },
        update: async (ref: DocRef, data: DocumentData) => {
          const update = splitUpdateOps(data);
          await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { session });
        },
        set: async (ref: DocRef, data: DocumentData, options?: { merge?: boolean }) => {
          if (options?.merge) {
            const update = splitUpdateOps(data);
            await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { upsert: true, session });
            return;
          }
          await db.collection(ref.collection).replaceOne({ _id: ref.id }, { _id: ref.id, ...data }, { upsert: true, session });
        },
        delete: async (ref: DocRef) => {
          await db.collection(ref.collection).deleteOne({ _id: ref.id }, { session });
        },
      };
      return fn(transaction);
    });
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      console.warn('MongoDB transactions are unavailable; falling back to non-transactional writes.');
      return await runWithoutTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export function writeBatch(_db: unknown) {
  const ops: WriteBatchOp[] = [];
  return {
    set: (ref: DocRef, data: DocumentData, options?: { merge?: boolean }) => {
      ops.push({ type: 'set', ref, data, options });
    },
    update: (ref: DocRef, data: DocumentData) => {
      ops.push({ type: 'update', ref, data });
    },
    delete: (ref: DocRef) => {
      ops.push({ type: 'delete', ref });
    },
    commit: async () => {
      const db = await getDb();
      const opsByCollection = new Map<string, WriteBatchOp[]>();
      ops.forEach((op) => {
        const list = opsByCollection.get(op.ref.collection) || [];
        list.push(op);
        opsByCollection.set(op.ref.collection, list);
      });

      for (const [collectionName, collectionOps] of opsByCollection.entries()) {
        const db = await getDbForCollection(collectionName);
        const bulkOps = collectionOps.map((op) => {
          if (op.type === 'set') {
            if (op.options?.merge) {
              return {
                updateOne: {
                  filter: { _id: op.ref.id },
                  update: splitUpdateOps(op.data),
                  upsert: true,
                },
              };
            }
            return {
              replaceOne: {
                filter: { _id: op.ref.id },
                replacement: { _id: op.ref.id, ...op.data },
                upsert: true,
              },
            };
          }
          if (op.type === 'update') {
            return {
              updateOne: {
                filter: { _id: op.ref.id },
                update: splitUpdateOps(op.data),
              },
            };
          }
          return {
            deleteOne: {
              filter: { _id: op.ref.id },
            },
          };
        });
        if (bulkOps.length) {
          await db.collection(collectionName).bulkWrite(bulkOps);
        }
      }
    },
  };
}

export function onSnapshot() {
  throw new DbServerError('server-only', 'Realtime subscriptions must run on the client.');
}
