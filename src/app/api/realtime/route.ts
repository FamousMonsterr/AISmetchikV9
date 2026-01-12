import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

type WhereFilter = { field: string; op: string; value: any };

function buildChangeStreamMatch(filters: WhereFilter[]) {
  const match: Record<string, any> = {};
  for (const filter of filters) {
    const key = `fullDocument.${filter.field}`;
    switch (filter.op) {
      case '==':
        match[key] = filter.value;
        break;
      case '!=':
        match[key] = { $ne: filter.value };
        break;
      case '>':
        match[key] = { $gt: filter.value };
        break;
      case '>=':
        match[key] = { $gte: filter.value };
        break;
      case '<':
        match[key] = { $lt: filter.value };
        break;
      case '<=':
        match[key] = { $lte: filter.value };
        break;
      case 'in':
        match[key] = { $in: filter.value };
        break;
      default:
        break;
    }
  }
  return match;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const collection = searchParams.get('collection');
  if (!collection) {
    return new Response('Missing collection', { status: 400 });
  }

  const db = await getDb();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('event: ready\ndata: {}\n\n'));

      const pipeline: any[] = [];
      if (type === 'doc') {
        const id = searchParams.get('id');
        if (id) {
          pipeline.push({ $match: { 'documentKey._id': id } });
        }
      } else {
        const rawFilters = searchParams.get('filters');
        const filters = rawFilters ? (JSON.parse(rawFilters) as WhereFilter[]) : [];
        const match = buildChangeStreamMatch(filters);
        if (Object.keys(match).length) {
          pipeline.push({ $match: match });
        }
      }

      const changeStream = db.collection(collection).watch(pipeline, { fullDocument: 'updateLookup' });

      const onChange = () => {
        controller.enqueue(encoder.encode('event: change\ndata: {}\n\n'));
      };

      changeStream.on('change', onChange);
      changeStream.on('error', (error) => {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`));
      });

      req.signal.addEventListener('abort', async () => {
        await changeStream.close();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
