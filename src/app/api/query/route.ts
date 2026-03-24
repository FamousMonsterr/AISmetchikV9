import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { authOptions } from '@/lib/auth';
import { getDbForCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

type WhereFilter = { field: string; op: string; value: any };
type OrderByClause = { field: string; direction: 'asc' | 'desc' };
type QueryBody = {
  type: 'doc' | 'query';
  collection: string;
  id?: string;
  filters?: WhereFilter[];
  orderBy?: OrderByClause[];
  limit?: number;
  cache?: boolean;
  noCache?: boolean;
};

const QUERY_CACHE_TTL_MS = Number(process.env.QUERY_CACHE_TTL_MS || 1500);
const DOC_CACHE_TTL_MS = Number(process.env.DOC_CACHE_TTL_MS || 800);
const QUERY_CACHE_MAX_ENTRIES = Number(process.env.QUERY_CACHE_MAX_ENTRIES || 300);
const QUERY_SLOW_MS = Number(process.env.QUERY_SLOW_OP_MS || 1200);
const QUERY_METRICS_LOG_ENABLED = process.env.QUERY_METRICS_LOG_ENABLED !== 'false';
const QUERY_METRICS_LOG_FILE = process.env.QUERY_METRICS_LOG_FILE || '.logs/api-query-metrics.jsonl';

type CachedPayload = {
  expiresAt: number;
  payload: any;
};

const queryResponseCache = new Map<string, CachedPayload>();
const queryInFlight = new Map<string, Promise<{ status: number; payload: any }>>();
const queryMetricsLogPath = resolve(/* turbopackIgnore: true */ process.cwd(), QUERY_METRICS_LOG_FILE);
let queryMetricsDirReadyPromise: Promise<void> | null = null;
let queryMetricsWriteChain = Promise.resolve();

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
  'user_templates',
  'partner_requests',
  'bug_reports',
]);

function buildMongoFilter(filters: WhereFilter[]) {
  const mongoFilter: Record<string, any> = {};
  for (const filter of filters) {
    switch (filter.op) {
      case '==':
        mongoFilter[filter.field] = filter.value;
        break;
      case '!=':
        mongoFilter[filter.field] = { $ne: filter.value };
        break;
      case '>':
        mongoFilter[filter.field] = { $gt: filter.value };
        break;
      case '>=':
        mongoFilter[filter.field] = { $gte: filter.value };
        break;
      case '<':
        mongoFilter[filter.field] = { $lt: filter.value };
        break;
      case '<=':
        mongoFilter[filter.field] = { $lte: filter.value };
        break;
      case 'in':
        mongoFilter[filter.field] = { $in: filter.value };
        break;
      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }
  return mongoFilter;
}

function buildDocIdFilter(id: string): Record<string, any> {
  if (!ObjectId.isValid(id)) {
    return { _id: id };
  }
  // Support both legacy string ids and Mongo ObjectId ids.
  return {
    $or: [
      { _id: id },
      { _id: new ObjectId(id) },
    ],
  };
}

function isAdmin(session: any) {
  return session?.user?.systemRole === 'Admin' || session?.user?.systemRole === 'Super Admin';
}

function hasUserFilter(filters: WhereFilter[] | undefined, userId: string) {
  return (filters || []).some((filter) => filter.field === 'userId' && filter.op === '==' && filter.value === userId);
}

function buildCacheKey(session: any, body: QueryBody): string {
  return JSON.stringify({
    userId: session?.user?.id || '',
    role: session?.user?.systemRole || '',
    type: body.type,
    collection: body.collection,
    id: body.id || null,
    filters: body.filters || [],
    orderBy: body.orderBy || [],
    limit: body.limit || null,
  });
}

function readCache(key: string): any | null {
  const entry = queryResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryResponseCache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeCache(key: string, payload: any, ttlMs: number) {
  queryResponseCache.set(key, {
    payload,
    expiresAt: Date.now() + Math.max(0, ttlMs),
  });
  if (queryResponseCache.size > QUERY_CACHE_MAX_ENTRIES) {
    // Map keeps insertion order; remove oldest entries first.
    const overflow = queryResponseCache.size - QUERY_CACHE_MAX_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
      const oldestKey = queryResponseCache.keys().next().value;
      if (!oldestKey) break;
      queryResponseCache.delete(oldestKey);
    }
  }
}

function getActorFingerprint(userId: string) {
  return createHash('sha1').update(userId).digest('hex').slice(0, 12);
}

function queueQueryMetricLog(entry: Record<string, any>) {
  if (!QUERY_METRICS_LOG_ENABLED) return;
  if (!queryMetricsDirReadyPromise) {
    queryMetricsDirReadyPromise = mkdir(dirname(queryMetricsLogPath), { recursive: true })
      .then(() => undefined)
      .catch((err) => {
        console.error('[api/query][metrics] cannot create log directory', err?.message || err);
      });
  }
  const line = `${JSON.stringify(entry)}\n`;
  queryMetricsWriteChain = queryMetricsWriteChain
    .then(async () => {
      if (queryMetricsDirReadyPromise) await queryMetricsDirReadyPromise;
      await appendFile(queryMetricsLogPath, line, 'utf8');
    })
    .catch((err) => {
      console.error('[api/query][metrics] cannot append log line', err?.message || err);
    });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as QueryBody | null;
  if (!body?.type || !body?.collection) {
    return NextResponse.json({ message: 'Invalid query' }, { status: 400 });
  }

  const admin = isAdmin(session);
  const userId = session.user.id;
  const skipCache = body.cache === false || body.noCache === true;
  const cacheTtlMs = body.type === 'doc' ? DOC_CACHE_TTL_MS : QUERY_CACHE_TTL_MS;
  const cacheKey = buildCacheKey(session, body);
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  const actorHash = getActorFingerprint(userId);

  const logQueryMetric = (status: number, cacheState: 'HIT' | 'INFLIGHT' | 'MISS' | 'BYPASS' | 'ERROR', extra?: Record<string, any>) => {
    const durationMs = Date.now() - requestStartedAt;
    queueQueryMetricLog({
      ts: new Date().toISOString(),
      requestId,
      type: body.type,
      collection: body.collection,
      status,
      cacheState,
      durationMs,
      slow: durationMs >= QUERY_SLOW_MS,
      actorRole: session.user.systemRole || 'User',
      actorHash,
      limit: body.limit || null,
      filtersCount: Array.isArray(body.filters) ? body.filters.length : 0,
      orderByCount: Array.isArray(body.orderBy) ? body.orderBy.length : 0,
      ...(extra || {}),
    });
  };

  try {
    if (!skipCache) {
      const cachedPayload = readCache(cacheKey);
      if (cachedPayload) {
        logQueryMetric(200, 'HIT', {
          docsCount: Array.isArray(cachedPayload?.docs) ? cachedPayload.docs.length : undefined,
          docFound: cachedPayload?.doc ? true : cachedPayload?.doc === null ? false : undefined,
        });
        return NextResponse.json(cachedPayload, {
          status: 200,
          headers: { 'x-query-cache': 'HIT' },
        });
      }

      const inFlight = queryInFlight.get(cacheKey);
      if (inFlight) {
        const result = await inFlight;
        logQueryMetric(result.status, 'INFLIGHT');
        return NextResponse.json(result.payload, {
          status: result.status,
          headers: { 'x-query-cache': 'INFLIGHT' },
        });
      }
    }

    const executeQuery = async (): Promise<{ status: number; payload: any }> => {
      if (!admin && adminCollections.has(body.collection)) {
        return { status: 403, payload: { message: 'Forbidden' } };
      }

      const db = await getDbForCollection(body.collection);

      if (body.type === 'doc') {
        if (!body.id) {
          return { status: 400, payload: { message: 'Missing doc id' } };
        }
        if (!admin && body.collection === 'users' && body.id !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        const doc = await db.collection<any>(body.collection).findOne(buildDocIdFilter(body.id));
        if (!admin && userOwnedCollections.has(body.collection) && doc?.userId !== userId) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
        return { status: 200, payload: { doc } };
      }

      if (!admin && body.collection === 'users') {
        return { status: 403, payload: { message: 'Forbidden' } };
      }

      const filters = (body.filters || []) as WhereFilter[];
      if (!admin && userOwnedCollections.has(body.collection) && !hasUserFilter(filters, userId)) {
        return { status: 403, payload: { message: 'Forbidden' } };
      }
      if (!admin && body.collection === 'notifications') {
        const hasPublished = filters.some(
          (filter) => filter.field === 'status' && filter.op === '==' && filter.value === 'published',
        );
        if (!hasPublished) {
          return { status: 403, payload: { message: 'Forbidden' } };
        }
      }

      const filter = buildMongoFilter(filters);
      const cursor = db.collection(body.collection).find(filter);
      if (Array.isArray(body.orderBy) && body.orderBy.length) {
        const sort: Record<string, 1 | -1> = {};
        (body.orderBy as OrderByClause[]).forEach((clause) => {
          sort[clause.field] = clause.direction === 'desc' ? -1 : 1;
        });
        cursor.sort(sort);
      }
      if (body.limit) {
        cursor.limit(body.limit);
      }
      const docs = await cursor.toArray();
      return { status: 200, payload: { docs } };
    };

    const executionPromise = executeQuery().then((result) => {
      if (!skipCache && result.status === 200 && cacheTtlMs > 0) {
        writeCache(cacheKey, result.payload, cacheTtlMs);
      }
      return result;
    });

    if (!skipCache) {
      queryInFlight.set(cacheKey, executionPromise);
    }

    const result = await executionPromise;
    queryInFlight.delete(cacheKey);
    logQueryMetric(result.status, skipCache ? 'BYPASS' : 'MISS');

    return NextResponse.json(result.payload, {
      status: result.status,
      headers: { 'x-query-cache': skipCache ? 'BYPASS' : 'MISS' },
    });
  } catch (error: any) {
    queryInFlight.delete(cacheKey);
    logQueryMetric(500, 'ERROR', { error: error.message || 'query_failed' });
    return NextResponse.json({ message: error.message || 'Query failed' }, { status: 500 });
  }
}
