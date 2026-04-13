import { NextRequest, NextResponse } from 'next/server';
import { getEnvSettings, updateEnvSettings } from '@/actions/adminActions';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

export async function GET(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const settings = await getEnvSettings({ requesterId: auth.user.id, requireAdmin: true, stripSecrets: true });
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

  const result = await updateEnvSettings(auth.user.id, payload);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, message: result.message });
}
