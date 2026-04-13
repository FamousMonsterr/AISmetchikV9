import { NextRequest, NextResponse } from 'next/server';
import { requeueFailedJobs } from '@/server-functions/admin/actions';
import { requireAdminUser } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request: req,
      scope: 'api:admin:requeue-worker',
      userId: auth.user.id,
      max: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { limit = 20 } = await req.json().catch(() => ({}));
    const result = await requeueFailedJobs(Number(limit) || 20);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Ошибка при возврате задач в очередь.' }, { status: 500 });
  }
}
