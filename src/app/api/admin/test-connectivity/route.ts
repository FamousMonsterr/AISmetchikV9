import { NextRequest, NextResponse } from 'next/server';
import { testConnectivity } from '@/actions/adminActions';
import { requireAdminUser } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request: req,
      scope: 'api:admin:test-connectivity',
      userId: auth.user.id,
      max: 15,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const result = await testConnectivity({ requesterId: auth.user.id, requireAdmin: true });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Ошибка проверки соединений.' }, { status: 500 });
  }
}
