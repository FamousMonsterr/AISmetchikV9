import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '@/lib/mongodb';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
  }

  const email = String(body.email).toLowerCase();
  const db = await getDb();
  const user = await db.collection('users').findOne({ email });

  if (!user || user.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

  await db.collection('password_setups').insertOne({
    userId: user._id,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('password_setup', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  return response;
}
