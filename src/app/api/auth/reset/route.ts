// @ts-nocheck
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Rate limit: 3 password resets per IP per hour
  const rateLimitResponse = enforceRateLimit({
    request: req as any,
    scope: 'auth:password-reset',
    max: 3,
    windowMs: 3600000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.password) {
    return NextResponse.json({ message: 'Token and password are required.' }, { status: 400 });
  }

  const password = String(body.password);
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const tokenHash = createHash('sha256').update(String(body.token)).digest('hex');
  const db = await getDb();

  const resetDoc = await db.collection('password_resets').findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!resetDoc) {
    return NextResponse.json({ message: 'Недействительный или просроченный токен.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection('users').updateOne({ _id: resetDoc.userId }, { $set: { passwordHash, updatedAt: new Date() } });
  await db.collection('password_resets').deleteMany({ userId: resetDoc.userId });

  return NextResponse.json({ ok: true });
}
