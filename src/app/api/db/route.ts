// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { appendFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { authOptions } from '@/lib/auth';
import { getDbForCollection } from '@/lib/mongodb';

type DocRef = { collection: string; id: string };
type WhereFilter = { field: string; op: string; value: any };
type OrderByClause = { field: string; direction: 'asc' | 'desc' };
type QueryPayload = {
  collection: string;
  filters?: WhereFilter[];
  orderBy?: OrderByClause[];
  limit?: number;
};
type RequestBody = {
  op: 'getDoc' | 'getDocs' | 'addDoc' | 'setDoc' | 'updateDoc' | 'deleteDoc';
  ref?: DocRef | { name: string };
  query?: QueryPayload;
  data?: Record<string, any>;
  options?: { merge?: boolean };
  cache?: boolean;
  noCache?: boolean;
};

const DB_GETDOC_CACHE_TTL_MS = Number(process.env.DB_GETDOC_CACHE_TTL_MS || 1200);
const DB_GETDOCS_CACHE_TTL_MS = Number(process.env.DB_GETDOCS_CACHE_TTL_MS || 1200);
const DB_CACHE_MAX_ENTRIES = Number(process.env.DB_CACHE_MAX_ENTRIES || 400);
const DB_SLOW_OP_MS = Number(process.env.DB_SLOW_OP_MS || 1200);
const DB_METRICS_LOG_ENABLED = process.env.DB_METRICS_LOG_ENABLED !== 'false';
const DB_METRICS_LOG_FILE = process.env.DB_METRICS_LOG_FILE || '.logs/api-db-metrics.jsonl';

type DbCacheEntry = {
  expiresAt: number;
  payload: any;
  collection: string;
  op: 'getDoc' | 'getDocs';
};

const dbResponseCache = new Map<string, DbCacheEntry>();
const dbInFlight = new Map<string, Promise<{ status: number; payload: any }>>();
const dbMetricsLogPath = resolve(/* turbopackIgnore: true */ process.cwd(), DB_METRICS_LOG_FILE);

let dbMetricsDirReadyPromise: Promise<void> | null = null;
let dbMetricsWriteChain = Promise.resolve();

const adminCollections = new Set([
  'user_logs',
  'ai_api_logs',
  'configs',
  'prompts',
  'surveys',
  'survey_responses',
  'knowledge_base_articles',
  'project_event_logs',
]);

const userOwnedCollections = new Set([
  'requests',
  'companies',
  'priceBaseItems',
  'invoices',
  'partner_requests',
  'bug_reports',
]);

const sharedCollections = new Set([
  'file_analysis_cache',
  's3_file_cache',
  'notifications',
]);

function buildMongoFilter(filters: WhereFilter[]) {
  const mongoFilter: Record<string, any> = {};

  const ensureFieldOps = (field: string) => {
    const current = mongoFilter[field];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      mongoFilter[field] = {};
    }
    return mongoFilter[field] as Record<string, any>;
  };

  for (const filter of filters) {
    switch (filter.op) {
      case '==':
        mongoFilter[filter.field] = filter.value;
        break;
      case '!=':
        ensureFieldOps(filter.field).$ne = filter.value;
        break;
      case '>':
        ensureFieldOps(filter.field).$gt = filter.value;
        break;
      case '>=':
        ensureFieldOps(filter.field).$gte = filter.value;
        break;
      case '<':
        ensureFieldOps(filter.field).$lt = filter.value;
        break;
      case '<=':
        ensureFieldOps(filter.field).$lte = filter.value;
        break;
      case 'in':
        ensureFieldOps(filter.field).$in = filter.value;
        break;
      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }
  return mongoFilter;
}

function splitUpdateOps(data: Record<string, any>) {
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
    set[key] = value;
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

function isAdmin(session: any) {
  return session?.user?.systemRole === 'Admin' || session?.user?.systemRole === 'Super Admin';
}

function hasUserFilter(filters: WhereFilter[] | undefined, userId: string) {
  return (filters || []).some((filter) => filter.field === 'userId' && filter.op === '==' && filter.value === userId);
}

function buildDbCacheKey(session: any, body: RequestBody) {
  return JSON.stringify({
    userId: session?.user?.id || '',
    role: session?.user?.systemRole || '',
    op: body.op,
    ref: body.ref || null,
    query: body.query || null,
  });
}

function readDbCache(key: string): any | null {
  const entry = dbResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    dbResponseCache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeDbCache(key: string, payload: any, collection: string, op: 'getDoc' | 'getDocs', ttlMs: number) {
  if (ttlMs <= 0) return;
  dbResponseCache.set(key, {
    payload,
    collection,
    op,
    expiresAt: Date.now() + ttlMs,
  });
  if (dbResponseCache.size > DB_CACHE_MAX_ENTRIES) {
    const overflow = dbResponseCache.size - DB_CACHE_MAX_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
      const oldestKey = dbResponseCache.keys().next().value;
      if (!oldestKey) break;
      dbResponseCache.delete(oldestKey);
    }
  }
}

function invalidateDbCacheForCollection(collectionName: string) {
  for (const [key, entry] of dbResponseCache.entries()) {
    if (entry.collection === collectionName) {
      dbResponseCache.delete(key);
    }
  }
  for (const [key, _entry] of dbInFlight.entries()) {
    if (key.includes(`"collection":"${collectionName}"`) || key.includes(`"name":"${collectionName}"`)) {
      dbInFlight.delete(key);
    }
  }
}

function logSlowDbOp(op: string, collection: string, startedAt: number, extra?: Record<string, any>) {
  const durationMs = Date.now() - startedAt;
  if (durationMs < DB_SLOW_OP_MS) return;
  console.warn('[api/db][slow-op]', {
    op,
    collection,
    durationMs,
    ...extra,
  });
}

function getCollectionFromBody(body: RequestBody): string {
  if (body.query?.collection) {
    return body.query.collection;
  }
  if (body.ref && 'collection' in body.ref && body.ref.collection) {
    return body.ref.collection;
  }
  if (body.ref && 'name' in body.ref && body.ref.name) {
    return body.ref.name;
  }
  return 'unknown';
}

function getQueryShape(body: RequestBody) {
  if (body.op !== 'getDocs' || !body.query) return {};
  const filters = body.query.filters || [];
  const orderBy = body.query.orderBy || [];
  return {
    limit: body.query.limit || null,
    filtersCount: filters.length,
    orderByCount: orderBy.length,
    filterFields: filters.slice(0, 12).map((f) => `${f.field}:${f.op}`),
    orderByFields: orderBy.slice(0, 8).map((o) => `${o.field}:${o.direction}`),
  };
}

function getActorFingerprint(userId: string) {
  return createHash('sha1').update(userId).digest('hex').slice(0, 12);
}

function queueDbMetricLog(entry: Record<string, any>) {
  if (!DB_METRICS_LOG_ENABLED) return;
  if (!dbMetricsDirReadyPromise) {
    dbMetricsDirReadyPromise = mkdir(dirname(dbMetricsLogPath), { recursive: true }).catch((err) => {
      console.error('[api/db][metrics] cannot create log directory', err?.message || err);
    });
  }
  const line = `${JSON.stringify(entry)}\n`;
  dbMetricsWriteChain = dbMetricsWriteChain
    .then(async () => {
      if (dbMetricsDirReadyPromise) {
        await dbMetricsDirReadyPromise;
      }
      await appendFile(dbMetricsLogPath, line, 'utf8');
    })
    .catch((err) => {
      console.error('[api/db][metrics] cannot append log line', err?.message || err);
    });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  if (!body?.op) {
    return NextResponse.json({ message: 'Missing operation' }, { status: 400 });
  }

  const admin = isAdmin(session);
  const userId = session.user.id;

  const { op } = body;
  const skipCache = body.cache === false || body.noCache === true;
  const cacheKey = buildDbCacheKey(session, body);
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  const collection = getCollectionFromBody(body);
  const db = await getDbForCollection(collection);
  const actorRole = session.user.systemRole || 'User';
  const actorHash = getActorFingerprint(userId);
  const queryShape = getQueryShape(body);

  const logDbRequestMetric = (status: number, cacheState: 'HIT' | 'INFLIGHT' | 'MISS' | 'BYPASS' | 'ERROR', extra?: Record<string, any>) => {
    const durationMs = Date.now() - requestStartedAt;
    queueDbMetricLog({
      ts: new Date().toISOString(),
      requestId,
      op,
      collection,
      status,
      cacheState,
      durationMs,
      slow: durationMs >= DB_SLOW_OP_MS,
      actorRole,
      actorHash,
      ...queryShape,
      ...(extra || {}),
    });
  };

  try {
    if (!skipCache && (op === 'getDoc' || op === 'getDocs')) {
      const cachedPayload = readDbCache(cacheKey);
      if (cachedPayload) {
        logDbRequestMetric(200, 'HIT', {
          docsCount: Array.isArray(cachedPayload?.docs) ? cachedPayload.docs.length : undefined,
          docFound: cachedPayload?.doc ? true : cachedPayload?.doc === null ? false : undefined,
        });
        return NextResponse.json(cachedPayload, {
          status: 200,
          headers: { 'x-db-cache': 'HIT' },
        });
      }
      const inFlight = dbInFlight.get(cacheKey);
      if (inFlight) {
        const result = await inFlight;
        logDbRequestMetric(result.status, 'INFLIGHT', {
          docsCount: Array.isArray(result?.payload?.docs) ? result.payload.docs.length : undefined,
          docFound: result?.payload?.doc ? true : result?.payload?.doc === null ? false : undefined,
        });
        return NextResponse.json(result.payload, {
          status: result.status,
          headers: { 'x-db-cache': 'INFLIGHT' },
        });
      }
    }

    const executeOperation = async (): Promise<{ status: number; payload: any; cacheCollection?: string; cacheTtlMs?: number; cacheOp?: 'getDoc' | 'getDocs'; metrics?: Record<string, any> }> => {
    switch (op) {
      case 'getDoc': {
        const startedAt = Date.now();
        const ref = body.ref as DocRef;
        if (!ref?.collection || !ref?.id) {
          return { status: 400, payload: { message: 'Invalid doc reference' } };
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        const doc = await db.collection(ref.collection).findOne({ _id: ref.id } as any);
        if (!admin && userOwnedCollections.has(ref.collection) && doc?.userId !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        logSlowDbOp(op, ref.collection, startedAt, { hit: !!doc });
        return {
          status: 200,
          payload: { doc },
          cacheCollection: ref.collection,
          cacheTtlMs: DB_GETDOC_CACHE_TTL_MS,
          cacheOp: 'getDoc',
          metrics: { docFound: !!doc },
        };
      }
      case 'getDocs': {
        const startedAt = Date.now();
        const query = body.query;
        if (!query?.collection) {
          return { status: 400, payload: { message: 'Invalid query' } };
        }
        if (!admin && query.collection === 'users') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && adminCollections.has(query.collection)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && userOwnedCollections.has(query.collection) && !hasUserFilter(query.filters, userId)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && query.collection === 'notifications') {
          const hasPublished = (query.filters || []).some(
            (filter: WhereFilter) => filter.field === 'status' && filter.op === '==' && filter.value === 'published',
          );
          if (!hasPublished) {
            return { status: 403, payload: { message: 'Forbidden' } };
          }
        }
        const filter = buildMongoFilter(query.filters || []);
        const cursor = db.collection(query.collection).find(filter);
        if (Array.isArray(query.orderBy) && query.orderBy.length) {
          const sort: Record<string, 1 | -1> = {};
          (query.orderBy as OrderByClause[]).forEach((clause) => {
            sort[clause.field] = clause.direction === 'desc' ? -1 : 1;
          });
          cursor.sort(sort);
        }
        if (query.limit) {
          cursor.limit(query.limit);
        }
        const docs = await cursor.toArray();
        logSlowDbOp(op, query.collection, startedAt, {
          docsCount: docs.length,
          limit: query.limit || null,
          filtersCount: (query.filters || []).length,
        });
        return {
          status: 200,
          payload: { docs },
          cacheCollection: query.collection,
          cacheTtlMs: DB_GETDOCS_CACHE_TTL_MS,
          cacheOp: 'getDocs',
          metrics: {
            docsCount: docs.length,
            filtersCount: (query.filters || []).length,
            orderByCount: (query.orderBy || []).length,
            limit: query.limit || null,
          },
        };
      }
      case 'addDoc': {
        const startedAt = Date.now();
        const ref = body.ref;
        const data = body.data || {};
        if (!ref?.name) {
          return { status: 400, payload: { message: 'Invalid collection reference' } };
        }
        if (!admin && ref.name === 'users') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && ref.name === 'notifications') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && adminCollections.has(ref.name)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && userOwnedCollections.has(ref.name) && data.userId !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && !userOwnedCollections.has(ref.name) && !sharedCollections.has(ref.name) && ref.name !== 'users') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        const docId = randomUUID();
        await db.collection(ref.name).insertOne({ _id: docId, ...data });
        invalidateDbCacheForCollection(ref.name);
        logSlowDbOp(op, ref.name, startedAt, { inserted: true });
        return {
          status: 200,
          payload: { id: docId },
          metrics: { inserted: true, dataFieldsCount: Object.keys(data).length },
        };
      }
      case 'setDoc': {
        const startedAt = Date.now();
        const ref = body.ref as DocRef;
        const data = body.data || {};
        const options = body.options || {};
        if (!ref?.collection || !ref?.id) {
          return { status: 400, payload: { message: 'Invalid doc reference' } };
        }
        if (!admin && ref.collection === 'notifications') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && userOwnedCollections.has(ref.collection)) {
          if (data.userId && data.userId !== userId) {
            return { status: 403, payload: { message: 'Forbidden' } };
          }
          const ownerDoc = await db.collection(ref.collection).findOne(
            { _id: ref.id, userId } as any,
            { projection: { _id: 1 } },
          );
          if (!ownerDoc) {
            return { status: 403, payload: { message: 'Forbidden' } };
          }
        }
        if (options.merge) {
          const update = splitUpdateOps(data);
          await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { upsert: true });
          invalidateDbCacheForCollection(ref.collection);
          logSlowDbOp(op, ref.collection, startedAt, { mode: 'merge' });
          return {
            status: 200,
            payload: { ok: true },
            metrics: { mode: 'merge', dataFieldsCount: Object.keys(data).length },
          };
        }
        await db.collection(ref.collection).replaceOne({ _id: ref.id }, { _id: ref.id, ...data }, { upsert: true });
        invalidateDbCacheForCollection(ref.collection);
        logSlowDbOp(op, ref.collection, startedAt, { mode: 'replace' });
        return {
          status: 200,
          payload: { ok: true },
          metrics: { mode: 'replace', dataFieldsCount: Object.keys(data).length },
        };
      }
      case 'updateDoc': {
        const startedAt = Date.now();
        const ref = body.ref as DocRef;
        const data = body.data || {};
        if (!ref?.collection || !ref?.id) {
          return { status: 400, payload: { message: 'Invalid doc reference' } };
        }
        if (!admin && ref.collection === 'notifications') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        const updateFilter = !admin && userOwnedCollections.has(ref.collection)
          ? ({ _id: ref.id, userId } as any)
          : ({ _id: ref.id } as any);
        const update = splitUpdateOps(data);
        const result = await db.collection(ref.collection).updateOne(updateFilter, update);
        if (!admin && userOwnedCollections.has(ref.collection) && result.matchedCount === 0) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        invalidateDbCacheForCollection(ref.collection);
        logSlowDbOp(op, ref.collection, startedAt, { matched: result.matchedCount, modified: result.modifiedCount });
        return {
          status: 200,
          payload: { ok: true },
          metrics: {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            dataFieldsCount: Object.keys(data).length,
          },
        };
      }
      case 'deleteDoc': {
        const startedAt = Date.now();
        const ref = body.ref as DocRef;
        if (!ref?.collection || !ref?.id) {
          return { status: 400, payload: { message: 'Invalid doc reference' } };
        }
        if (!admin && ref.collection === 'notifications') {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        const deleteFilter = !admin && userOwnedCollections.has(ref.collection)
          ? ({ _id: ref.id, userId } as any)
          : ({ _id: ref.id } as any);
        const result = await db.collection(ref.collection).deleteOne(deleteFilter);
        if (!admin && userOwnedCollections.has(ref.collection) && result.deletedCount === 0) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        invalidateDbCacheForCollection(ref.collection);
        logSlowDbOp(op, ref.collection, startedAt, { deleted: result.deletedCount });
        return {
          status: 200,
          payload: { ok: true },
          metrics: { deletedCount: result.deletedCount },
        };
      }
      default:
        return { status: 400, payload: { message: 'Unsupported operation' } };
    }
  };

    const executionPromise = executeOperation().then((result) => {
      if (
        !skipCache
        && result.status === 200
        && (op === 'getDoc' || op === 'getDocs')
        && result.cacheCollection
        && result.cacheTtlMs
        && result.cacheOp
      ) {
        writeDbCache(cacheKey, result.payload, result.cacheCollection, result.cacheOp, result.cacheTtlMs);
      }
      return result;
    });

    if (!skipCache && (op === 'getDoc' || op === 'getDocs')) {
      dbInFlight.set(cacheKey, executionPromise as Promise<{ status: number; payload: any }>);
    }

    const result = await executionPromise;
    dbInFlight.delete(cacheKey);
    logDbRequestMetric(result.status, skipCache ? 'BYPASS' : 'MISS', result.metrics);
    return NextResponse.json(result.payload, {
      status: result.status,
      headers: { 'x-db-cache': skipCache ? 'BYPASS' : 'MISS' },
    });
  } catch (error: any) {
    dbInFlight.delete(cacheKey);
    logDbRequestMetric(error.message === 'Forbidden' ? 403 : 500, 'ERROR', {
      error: error?.message || 'unknown',
    });
    if (error.message === 'Forbidden') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || 'Request failed' }, { status: 500 });
  }
}
