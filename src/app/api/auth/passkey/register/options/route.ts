import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPublicOriginFromRequest } from '@/lib/passkeys/config';
import { beginPasskeyRegistration } from '@/lib/passkeys/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const options = await beginPasskeyRegistration({
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    displayName: session.user.name ?? null,
    nickname: body?.nickname ?? null,
    requestOrigin: getPublicOriginFromRequest(request),
  });

  return NextResponse.json(options);
}
