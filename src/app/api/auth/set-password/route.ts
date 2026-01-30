// @ts-nocheck
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.password || !body?.email) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
  }

  const password = String(body.password);
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const token = cookies().get('password_setup')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Setup token is missing.' }, { status: 401 });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const db = await getDb();

  const setupDoc = await db.collection('password_setups').findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!setupDoc) {
    return NextResponse.json({ message: 'Setup token is invalid or expired.' }, { status: 401 });
  }

  const email = String(body.email).toLowerCase();
  const user = await db.collection('users').findOne({ _id: setupDoc.userId, email });
  if (!user) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { passwordHash, updatedAt: new Date() } },
  );
  await db.collection('password_setups').deleteMany({ userId: user._id });

  cookies().set('password_setup', '', { maxAge: 0, path: '/' });

  return NextResponse.json({ ok: true });
}
