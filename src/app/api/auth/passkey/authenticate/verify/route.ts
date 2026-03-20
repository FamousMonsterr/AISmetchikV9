import { NextResponse } from 'next/server';
import { getPublicOriginFromRequest } from '@/lib/passkeys/config';
import { completePasskeyAuthentication } from '@/lib/passkeys/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.challengeId || !payload?.credential?.response?.clientDataJSON || !payload?.credential?.response?.authenticatorData || !payload?.credential?.response?.signature) {
    return NextResponse.json({ message: 'Invalid passkey authentication payload.' }, { status: 400 });
  }

  try {
    const result = await completePasskeyAuthentication({
      ...payload,
      requestOrigin: getPublicOriginFromRequest(request),
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Passkey authentication failed.' }, { status: 400 });
  }
}
