import { SignJWT, jwtVerify } from 'jose';
import { getAppSettings } from '@/actions/adminActions';

type TokenType = 'access' | 'refresh';

export type ApiJwtUser = {
  id: string;
  role: string;
  plan: string;
  email?: string;
};

type JwtPayload = {
  sub: string;
  role: string;
  plan: string;
  email?: string;
  typ: TokenType;
};

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

async function resolveJwtConfig() {
  const appSettings = await getAppSettings().catch(() => null);
  const issuer = appSettings?.jwtIssuer || process.env.BACKEND_JWT_ISSUER || 'montagehub-backend';
  const audience = appSettings?.jwtAudience || process.env.BACKEND_JWT_AUDIENCE || 'montagehub-frontend';
  const secret = process.env.BACKEND_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured (BACKEND_JWT_SECRET/NEXTAUTH_SECRET).');
  }
  return { issuer, audience, secret };
}

async function signToken(user: ApiJwtUser, typ: TokenType, expiresIn: string): Promise<string> {
  const cfg = await resolveJwtConfig();
  const key = new TextEncoder().encode(cfg.secret);
  return new SignJWT({
    role: user.role,
    plan: user.plan,
    email: user.email,
    typ,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(cfg.issuer)
    .setAudience(cfg.audience)
    .setSubject(user.id)
    .setExpirationTime(expiresIn)
    .sign(key);
}

async function verifyToken(token: string, expectedType: TokenType): Promise<ApiJwtUser> {
  const cfg = await resolveJwtConfig();
  const key = new TextEncoder().encode(cfg.secret);
  const { payload } = await jwtVerify(token, key, {
    issuer: cfg.issuer,
    audience: cfg.audience,
  });
  const typedPayload = payload as unknown as JwtPayload;
  if (typedPayload.typ !== expectedType) {
    throw new Error(`Invalid token type: ${typedPayload.typ}`);
  }
  return {
    id: typedPayload.sub,
    role: typedPayload.role || 'User',
    plan: typedPayload.plan || 'Free',
    email: typedPayload.email,
  };
}

export async function issueApiTokens(user: ApiJwtUser): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signToken(user, 'access', ACCESS_TTL),
    signToken(user, 'refresh', REFRESH_TTL),
  ]);
  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<ApiJwtUser> {
  return verifyToken(token, 'access');
}

export async function verifyRefreshToken(token: string): Promise<ApiJwtUser> {
  return verifyToken(token, 'refresh');
}
