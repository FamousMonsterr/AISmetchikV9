import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { issueApiTokens } from '@/lib/backend-jwt';
import { enforceRateLimit } from '@/lib/rate-limit';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:v1:auth:login',
      max: 15,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const payload = await request.json();
    const validation = LoginSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid credentials payload.' }, { status: 400 });
    }

    const email = validation.data.email.toLowerCase();
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user || user.status === 'blocked' || user.archivedAt) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Password setup required.' }, { status: 409 });
    }

    const passwordOk = await bcrypt.compare(validation.data.password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const tokenUser = {
      id: String(user._id),
      role: user.systemRole || 'User',
      plan: user.plan || 'Free',
      email: user.email,
    };
    const { accessToken, refreshToken } = await issueApiTokens(tokenUser);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: tokenUser.id,
        email: tokenUser.email,
        displayName: user.displayName || '',
        role: tokenUser.role,
        plan: tokenUser.plan,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Login failed.' }, { status: 500 });
  }
}
