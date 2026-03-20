import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPublicOriginFromRequest } from '@/lib/passkeys/config';
import { completePasskeyRegistration } from '@/lib/passkeys/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload?.challengeId || !payload?.credential?.response?.clientDataJSON || !payload?.credential?.response?.attestationObject) {
    return NextResponse.json({ message: 'Invalid passkey registration payload.' }, { status: 400 });
  }

  try {
    const result = await completePasskeyRegistration({
      ...payload,
      userId: session.user.id,
      requestOrigin: getPublicOriginFromRequest(request),
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Passkey registration failed.' }, { status: 400 });
  }
}
