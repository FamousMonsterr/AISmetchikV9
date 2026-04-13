import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, updateAppSettings } from '@/actions/adminActions';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

export async function GET(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const current = await getAppSettings();
  const next = { ...current, ...payload };
  const result = await updateAppSettings(auth.user.id, next as any);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, message: result.message });
}
