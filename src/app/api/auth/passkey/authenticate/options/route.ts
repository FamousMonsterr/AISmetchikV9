import { NextResponse } from 'next/server';
import { getPublicOriginFromRequest } from '@/lib/passkeys/config';
import { beginPasskeyAuthentication } from '@/lib/passkeys/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    const options = await beginPasskeyAuthentication({
      identifier: body?.identifier ?? null,
      requestOrigin: getPublicOriginFromRequest(request),
    });
    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Passkey authentication options failed.' }, { status: 400 });
  }
}
