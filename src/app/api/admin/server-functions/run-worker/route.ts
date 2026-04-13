import { NextRequest, NextResponse } from 'next/server';
import { runServerWorkerOnce } from '@/server-functions/admin/actions';
import { getAppSettings } from '@/actions/adminActions';
import { requireAdminUser } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request: req,
      scope: 'api:admin:run-worker',
      userId: auth.user.id,
      max: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { limit = 3 } = await req.json().catch(() => ({}));
    // Ensure server functions enabled
    const settings = await getAppSettings();
    if (!settings.serverFunctionsEnabled || settings.serverFunctionsMode !== 'server') {
      return NextResponse.json({ success: false, message: 'Серверные функции выключены.' }, { status: 400 });
    }
    const result = await runServerWorkerOnce(Number(limit) || 3);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Ошибка запуска воркера.' }, { status: 500 });
  }
}
