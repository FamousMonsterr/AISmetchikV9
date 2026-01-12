import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

type DocRef = { collection: string; id: string };
type WhereFilter = { field: string; op: string; value: any };
type OrderByClause = { field: string; direction: 'asc' | 'desc' };

const adminCollections = new Set([
  'user_logs',
  'ai_api_logs',
  'configs',
  'prompts',
  'surveys',
  'survey_responses',
  'knowledge_base_articles',
]);

const userOwnedCollections = new Set([
  'requests',
  'companies',
  'priceBaseItems',
  'invoices',
  'partner_requests',
  'bug_reports',
  'user_notifications',
]);

const sharedCollections = new Set([
  'file_analysis_cache',
  's3_file_cache',
  'notifications',
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

async function ensureOwnership(db: any, ref: DocRef, userId: string) {
  const doc = await db.collection(ref.collection).findOne({ _id: ref.id });
  if (!doc || doc.userId !== userId) {
    throw new Error('Forbidden');
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.op) {
    return NextResponse.json({ message: 'Missing operation' }, { status: 400 });
  }

  const db = await getDb();
  const admin = isAdmin(session);
  const userId = session.user.id;

  const { op } = body;

  try {
    switch (op) {
      case 'getDoc': {
        const ref = body.ref as DocRef;
        if (!ref?.collection || !ref?.id) {
          return NextResponse.json({ message: 'Invalid doc reference' }, { status: 400 });
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(ref.collection)) {
          await ensureOwnership(db, ref, userId);
        }
        const doc = await db.collection(ref.collection).findOne({ _id: ref.id });
        return NextResponse.json({ doc });
      }
      case 'getDocs': {
        const query = body.query;
        if (!query?.collection) {
          return NextResponse.json({ message: 'Invalid query' }, { status: 400 });
        }
        if (!admin && query.collection === 'users') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && adminCollections.has(query.collection)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(query.collection) && !hasUserFilter(query.filters, userId)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && query.collection === 'notifications') {
          const hasPublished = (query.filters || []).some(
            (filter: WhereFilter) => filter.field === 'status' && filter.op === '==' && filter.value === 'published',
          );
          if (!hasPublished) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
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
        return NextResponse.json({ docs });
      }
      case 'addDoc': {
        const ref = body.ref;
        const data = body.data || {};
        if (!ref?.name) {
          return NextResponse.json({ message: 'Invalid collection reference' }, { status: 400 });
        }
        if (!admin && ref.name === 'users') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && ref.name === 'notifications') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && adminCollections.has(ref.name)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(ref.name) && data.userId !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && !userOwnedCollections.has(ref.name) && !sharedCollections.has(ref.name) && ref.name !== 'users') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        const docId = crypto.randomUUID();
        await db.collection(ref.name).insertOne({ _id: docId, ...data });
        return NextResponse.json({ id: docId });
      }
      case 'setDoc': {
        const ref = body.ref as DocRef;
        const data = body.data || {};
        const options = body.options || {};
        if (!ref?.collection || !ref?.id) {
          return NextResponse.json({ message: 'Invalid doc reference' }, { status: 400 });
        }
        if (!admin && ref.collection === 'notifications') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(ref.collection)) {
          if (data.userId && data.userId !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
          }
          await ensureOwnership(db, ref, userId);
        }
        if (options.merge) {
          const update = splitUpdateOps(data);
          await db.collection(ref.collection).updateOne({ _id: ref.id }, update, { upsert: true });
          return NextResponse.json({ ok: true });
        }
        await db.collection(ref.collection).replaceOne({ _id: ref.id }, { _id: ref.id, ...data }, { upsert: true });
        return NextResponse.json({ ok: true });
      }
      case 'updateDoc': {
        const ref = body.ref as DocRef;
        const data = body.data || {};
        if (!ref?.collection || !ref?.id) {
          return NextResponse.json({ message: 'Invalid doc reference' }, { status: 400 });
        }
        if (!admin && ref.collection === 'notifications') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(ref.collection)) {
          await ensureOwnership(db, ref, userId);
        }
        const update = splitUpdateOps(data);
        await db.collection(ref.collection).updateOne({ _id: ref.id }, update);
        return NextResponse.json({ ok: true });
      }
      case 'deleteDoc': {
        const ref = body.ref as DocRef;
        if (!ref?.collection || !ref?.id) {
          return NextResponse.json({ message: 'Invalid doc reference' }, { status: 400 });
        }
        if (!admin && ref.collection === 'notifications') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && adminCollections.has(ref.collection)) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && ref.collection === 'users' && ref.id !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (!admin && userOwnedCollections.has(ref.collection)) {
          await ensureOwnership(db, ref, userId);
        }
        await db.collection(ref.collection).deleteOne({ _id: ref.id });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ message: 'Unsupported operation' }, { status: 400 });
    }
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || 'Request failed' }, { status: 500 });
  }
}
