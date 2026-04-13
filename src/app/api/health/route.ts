// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getServerHealth } from '@/server-functions/monitoring/health';

export async function GET() {
  try {
    const health = await getServerHealth();
    return NextResponse.json(health);
  } catch (error: any) {
    console.error('[health] error', error);
    return NextResponse.json({ ok: false, error: 'health_check_failed' }, { status: 500 });
  }
}
