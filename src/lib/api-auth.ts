import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type ApiSessionUser = {
  id: string;
  role: string;
  plan: string;
};

type SessionResult =
  | { ok: true; user: ApiSessionUser }
  | { ok: false; response: NextResponse };

function toApiSessionUser(session: any): ApiSessionUser {
  return {
    id: session.user.id,
    role: session.user.systemRole || 'User',
    plan: session.user.plan || 'Free',
  };
}

export async function requireAuthenticatedUser(): Promise<SessionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }),
    };
  }
  return { ok: true, user: toApiSessionUser(session) };
}

export async function requireAdminUser(): Promise<SessionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const isAdmin = auth.user.role === 'Admin' || auth.user.role === 'Super Admin';
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 }),
    };
  }
  return auth;
}

export function validateRequestedUserId(
  requestedUserId: string | undefined,
  authenticatedUserId: string
): { ok: true } | { ok: false; response: NextResponse } {
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Нельзя выполнять запрос от имени другого пользователя.' }, { status: 403 }),
    };
  }
  return { ok: true };
}
