import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

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

function isAdmin(session: any) {
  return session?.user?.systemRole === 'Admin' || session?.user?.systemRole === 'Super Admin';
}

function hasUserFilter(filters: WhereFilter[] | undefined, userId: string) {
  return (filters || []).some((filter) => filter.field === 'userId' && filter.op === '==' && filter.value === userId);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.collection) {
    return NextResponse.json({ message: 'Invalid query' }, { status: 400 });
  }

  const admin = isAdmin(session);
  const userId = session.user.id;
  const db = await getDb();

  try {
    if (!admin && adminCollections.has(body.collection)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (body.type === 'doc') {
      if (!body.id) {
        return NextResponse.json({ message: 'Missing doc id' }, { status: 400 });
      }
      if (!admin && body.collection === 'users' && body.id !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const doc = await db.collection(body.collection).findOne({ _id: body.id });
      if (!admin && userOwnedCollections.has(body.collection) && doc?.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ doc });
    }

    if (!admin && body.collection === 'users') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const filters = (body.filters || []) as WhereFilter[];
    if (!admin && userOwnedCollections.has(body.collection) && !hasUserFilter(filters, userId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (!admin && body.collection === 'notifications') {
      const hasPublished = filters.some(
        (filter) => filter.field === 'status' && filter.op === '==' && filter.value === 'published',
      );
      if (!hasPublished) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ docs });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Query failed' }, { status: 500 });
  }
}
