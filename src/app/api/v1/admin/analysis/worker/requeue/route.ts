import { NextRequest, NextResponse } from 'next/server';
import { requireV1BearerUser } from '@/lib/api-v1-auth';
import { requeueFailedJobs } from '@/server-functions/admin/actions';

export async function POST(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { limit = 20 } = await request.json().catch(() => ({}));
  const result = await requeueFailedJobs(Number(limit) || 20);
  return NextResponse.json(result);
}
