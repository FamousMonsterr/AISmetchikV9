import { NextRequest, NextResponse } from 'next/server';
import { testConnectivity } from '@/actions/adminActions';

export async function GET(req: NextRequest) {
  try {
    const requesterId = req.headers.get('x-user-id') || undefined;
    const result = await testConnectivity({ requesterId, requireAdmin: true });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Ошибка проверки соединений.' }, { status: 500 });
  }
}
