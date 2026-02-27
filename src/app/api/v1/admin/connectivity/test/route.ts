import { NextRequest, NextResponse } from 'next/server';
import { requireV1BearerUser } from '@/lib/api-v1-auth';
import { testConnectivity } from '@/actions/adminActions';

export async function GET(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const result = await testConnectivity({ requesterId: auth.user.id, requireAdmin: true });
  return NextResponse.json(result);
}
