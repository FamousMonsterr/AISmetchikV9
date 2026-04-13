import { NextRequest, NextResponse } from 'next/server';
import { requireV1BearerUser } from '@/lib/api-v1-auth';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: auth.user.id } as any);
  if (!user || user.status === 'blocked' || user.archivedAt) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id,
    email: user.email,
    displayName: user.displayName || '',
    role: user.systemRole || 'User',
    plan: user.plan || 'Free',
  });
}
