import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type ApiJwtUser } from '@/lib/backend-jwt';

export async function requireV1BearerUser(request: NextRequest): Promise<
  | { ok: true; user: ApiJwtUser }
  | { ok: false; response: NextResponse }
> {
  const header = request.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing Bearer token.' }, { status: 401 }),
    };
  }

  try {
    const user = await verifyAccessToken(token);
    return { ok: true, user };
  } catch (error: any) {
    return {
      ok: false,
      response: NextResponse.json({ error: error?.message || 'Invalid token.' }, { status: 401 }),
    };
  }
}
