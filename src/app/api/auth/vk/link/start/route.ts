import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { buildVkAuthorizeUrl } from '@/lib/vk-auth';

function resolveBaseUrl(request: Request): string {
  return process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const clientId = process.env.VK_ID_CLIENT_ID?.trim();
  const clientSecret = process.env.VK_ID_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'VK auth is not configured.' }, { status: 500 });
  }

  const baseUrl = resolveBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/vk/link/callback`;
  const state = nanoid(32);
  const db = await getDb();
  await db.collection<any>('auth_link_states').insertOne({
    _id: state,
    provider: 'vk',
    userId,
    redirectUri,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return NextResponse.redirect(buildVkAuthorizeUrl({ clientId, redirectUri, state }));
}
