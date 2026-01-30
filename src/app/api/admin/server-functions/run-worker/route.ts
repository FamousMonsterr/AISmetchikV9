import { NextRequest, NextResponse } from 'next/server';
import { runServerWorkerOnce } from '@/server-functions/admin/actions';
import { getEnvSettings } from '@/actions/adminActions';

export async function POST(req: NextRequest) {
  try {
    const { limit = 3 } = await req.json().catch(() => ({}));
    // Ensure server functions enabled
    const settings = await getEnvSettings({ allowInternal: true });
    if (!settings.serverFunctionsEnabled || settings.serverFunctionsMode !== 'server') {
      return NextResponse.json({ success: false, message: 'Серверные функции выключены.' }, { status: 400 });
    }
    const result = await runServerWorkerOnce(Number(limit) || 3);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Ошибка запуска воркера.' }, { status: 500 });
  }
}
