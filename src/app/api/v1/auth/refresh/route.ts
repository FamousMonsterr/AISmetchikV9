import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRefreshToken, issueApiTokens } from '@/lib/backend-jwt';
import { getDb } from '@/lib/mongodb';
import { enforceRateLimit } from '@/lib/rate-limit';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:v1:auth:refresh',
      max: 30,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const payload = await request.json();
    const validation = RefreshSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid refresh payload.' }, { status: 400 });
    }

    const refreshUser = await verifyRefreshToken(validation.data.refreshToken);
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: refreshUser.id } as any);
    if (!user || user.status === 'blocked' || user.archivedAt) {
      return NextResponse.json({ error: 'User is unavailable.' }, { status: 401 });
    }

    const { accessToken, refreshToken } = await issueApiTokens({
      id: String(user._id),
      role: user.systemRole || 'User',
      plan: user.plan || 'Free',
      email: user.email,
    });

    return NextResponse.json({ accessToken, refreshToken });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Refresh failed.' }, { status: 401 });
  }
}
