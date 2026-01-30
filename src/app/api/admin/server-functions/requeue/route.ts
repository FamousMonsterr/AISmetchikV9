import { NextRequest, NextResponse } from 'next/server';
import { requeueFailedJobs } from '@/server-functions/admin/actions';

export async function POST(req: NextRequest) {
  try {
    const { limit = 20 } = await req.json().catch(() => ({}));
    const result = await requeueFailedJobs(Number(limit) || 20);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Ошибка при возврате задач в очередь.' }, { status: 500 });
  }
}
