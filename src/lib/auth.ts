import type { NextAuthOptions } from 'next-auth';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { parse as parseTelegramInitData, validate as validateTelegramInitData } from '@tma.js/init-data-node';
import { getDb } from '@/lib/mongodb';
import modelsConfig from '@/lib/ai-config.json';
import { consumePasskeySignInTicket } from '@/lib/passkeys/store';

function normalizeId(id: any): string {
  if (typeof id === 'string') return id;
  if (id == null) return '';
  if (typeof id.toString === 'function') return id.toString();
  return String(id);
}

function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function getSharedAuthCookieDomain(): string {
  const explicitDomain = process.env.NEXTAUTH_COOKIE_DOMAIN?.trim();
  if (explicitDomain) {
    return explicitDomain;
  }

  const siteUrl = process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || '';
  if (!siteUrl) {
    return '';
  }

  try {
    const hostname = new URL(siteUrl).hostname.trim().toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return '';
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return '';
    }
    return hostname;
  } catch {
    return '';
  }
}

function getDefaultModelValue(): string {
  const { apiModels } = modelsConfig as any;
  const defaultModel = apiModels.find((m: any) => m.isDefault) || apiModels[0];
  return defaultModel?.value || 'google/gemini-3-flash-preview';
}

function buildUserDefaults(params: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const emailPrefix = params.email.split('@')[0] || 'Пользователь';
  const now = new Date();

  return {
    displayName: params.displayName?.trim() || emailPrefix,
    phone: '',
    phoneVerified: false,
    telegramUsername: '',
    systemRole: 'User',
    plan: 'Free',
    isTester: false,
    isDebugger: false,
    isPartner: false,
    isEditor: false,
    credits: 10,
    projectCount: 0,
    createdAt: now,
    updatedAt: now,
    termsAgreedAt: now,
    agreedToMarketing: false,
    agreedToThirdParty: false,
    maxCompanies: 1,
    maxActiveProjects: 10,
    maxDraftsPerProject: 3,
    availableModels: [getDefaultModelValue()],
    canShareProjects: false,
    canUsePrivatePriceBase: false,
    canGroupProjects: false,
    status: 'active',
    archivedAt: null,
    avatarUrl: params.avatarUrl || null,
    avatarObjectKey: null,
    avatarUrlExpirationTimestamp: null,
    googleId: null,
    googleLinkedAt: null,
    authProvider: 'credentials',
    lastLoginAt: now,
  };
}

function getMissingDefaults(existingUser: Record<string, any>, defaults: Record<string, any>) {
  const updates: Record<string, any> = {};

  for (const [key, value] of Object.entries(defaults)) {
    const current = existingUser?.[key];

    if (Array.isArray(value)) {
      if (!Array.isArray(current) || current.length === 0) {
        updates[key] = value;
      }
      continue;
    }

    if (value instanceof Date) {
      if (!current) {
        updates[key] = value;
      }
      continue;
    }

    if (typeof value === 'boolean') {
      if (current == null) {
        updates[key] = value;
      }
      continue;
    }

    if (typeof value === 'number') {
      if (current == null) {
        updates[key] = value;
      }
      continue;
    }

    if (typeof value === 'string') {
      if (typeof current !== 'string' || !current.trim()) {
        updates[key] = value;
      }
      continue;
    }

    if (current == null) {
      updates[key] = value;
    }
  }

  return updates;
}

function toSessionUser(user: Record<string, any>) {
  return {
    id: normalizeId(user._id ?? user.id),
    email: user.email,
    name: user.displayName,
    image: user.avatarUrl || user.image || null,
    systemRole: user.systemRole,
    plan: user.plan,
    isPartner: !!user.isPartner,
    authProvider: user.authProvider || 'credentials',
  };
}

async function syncExistingUserForSession(user: Record<string, any>, provider: 'credentials' | 'google' | 'passkey' | 'telegram') {
  const db = await getDb();
  const email = normalizeEmail(user.email);
  const updates = getMissingDefaults(
    user,
    buildUserDefaults({
      email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }),
  );
  updates.lastLoginAt = new Date();
  updates.authProvider = provider;

  if (Object.keys(updates).length) {
    await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
  }

  return toSessionUser({ ...user, ...updates, authProvider: provider });
}

export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function isAppleAuthEnabled(): boolean {
  return Boolean(process.env.APPLE_ID?.trim() && process.env.APPLE_SECRET?.trim());
}

function getTelegramAuthToken(): string {
  return (
    process.env.TELEGRAM_BOT_TOKEN_USER?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    ''
  );
}

function getTelegramAuthEmailDomain(): string {
  return process.env.TELEGRAM_AUTH_EMAIL_DOMAIN?.trim() || 'telegram.local';
}

function buildTelegramSyntheticEmail(telegramId: number | string): string {
  return normalizeEmail(`telegram-${telegramId}@${getTelegramAuthEmailDomain()}`);
}

function buildTelegramDisplayName(telegramUser: Record<string, any>) {
  const fullName = [telegramUser.first_name, telegramUser.last_name]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .trim();
  return fullName || telegramUser.username || `Telegram ${telegramUser.id}`;
}

export function isTelegramMiniAppAuthEnabled(): boolean {
  return Boolean(getTelegramAuthToken());
}

async function syncGoogleUser(profile: Record<string, any>, account?: Record<string, any>) {
  const email = normalizeEmail(profile?.email);
  if (!email) {
    throw new Error('Google account did not return an email address.');
  }
  if (profile?.email_verified === false) {
    throw new Error('Google email address is not verified.');
  }

  const db = await getDb();
  const usersCollection = db.collection('users');
  const now = new Date();
  const providerAccountId = account?.providerAccountId ? String(account.providerAccountId) : '';
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser?.status === 'blocked' || existingUser?.archivedAt) {
    throw new Error('Аккаунт заблокирован. Обратитесь к администратору.');
  }

  const displayName = typeof profile?.name === 'string' ? profile.name : null;
  const avatarUrl = typeof profile?.picture === 'string' ? profile.picture : null;

  if (!existingUser) {
    const userId = nanoid();
    const userData: any = {
      _id: userId,
      email,
      ...buildUserDefaults({ email, displayName, avatarUrl }),
      displayName: displayName?.trim() || email.split('@')[0] || 'Пользователь',
      avatarUrl,
      authProvider: 'google',
      googleId: providerAccountId || null,
      googleLinkedAt: now,
      lastLoginAt: now,
      updatedAt: now,
    };

    await usersCollection.insertOne(userData);
    return toSessionUser(userData);
  }

  const updates: Record<string, any> = {
    updatedAt: now,
    lastLoginAt: now,
    authProvider: 'google',
    googleId: providerAccountId || existingUser.googleId || null,
    googleLinkedAt: existingUser.googleLinkedAt || now,
  };

  Object.assign(
    updates,
    getMissingDefaults(
      existingUser,
      buildUserDefaults({
        email,
        displayName,
        avatarUrl: existingUser.avatarUrl || avatarUrl,
      }),
    ),
  );

  if (!existingUser.avatarUrl && avatarUrl) {
    updates.avatarUrl = avatarUrl;
  }
  if (!existingUser.displayName && displayName) {
    updates.displayName = displayName;
  }
  if (!existingUser.status) {
    updates.status = 'active';
  }
  if (!existingUser.plan) {
    updates.plan = 'Free';
  }
  if (!existingUser.systemRole) {
    updates.systemRole = 'User';
  }

  await usersCollection.updateOne({ _id: existingUser._id }, { $set: updates });
  return toSessionUser({ ...existingUser, ...updates });
}

async function syncTelegramUser(telegramUser: Record<string, any>) {
  const telegramId = Number(telegramUser?.id);
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    throw new Error('Telegram user id is invalid.');
  }

  const db = await getDb();
  const usersCollection = db.collection('users');
  const syntheticEmail = buildTelegramSyntheticEmail(telegramId);
  const displayName = buildTelegramDisplayName(telegramUser);
  const avatarUrl = typeof telegramUser?.photo_url === 'string' ? telegramUser.photo_url : null;
  const now = new Date();

  const existingByTelegram = await usersCollection.findOne({ telegramChatId: telegramId });
  const existingBySyntheticEmail = existingByTelegram ? null : await usersCollection.findOne({ email: syntheticEmail });
  const existingUser = existingByTelegram || existingBySyntheticEmail;

  if (existingUser?.status === 'blocked' || existingUser?.archivedAt) {
    throw new Error('Аккаунт заблокирован. Обратитесь к администратору.');
  }

  if (!existingUser) {
    const userId = nanoid();
    const userData: any = {
      _id: userId,
      email: syntheticEmail,
      ...buildUserDefaults({ email: syntheticEmail, displayName, avatarUrl }),
      displayName,
      avatarUrl,
      telegramChatId: telegramId,
      telegramUsername: telegramUser.username || '',
      authProvider: 'telegram',
      telegramLinkedAt: now,
      lastLoginAt: now,
      updatedAt: now,
    };

    await usersCollection.insertOne(userData);
    return toSessionUser(userData);
  }

  const updates: Record<string, any> = {
    updatedAt: now,
    lastLoginAt: now,
    authProvider: 'telegram',
    telegramChatId: telegramId,
    telegramUsername: telegramUser.username || existingUser.telegramUsername || '',
    telegramLinkedAt: existingUser.telegramLinkedAt || now,
  };

  Object.assign(
    updates,
    getMissingDefaults(
      existingUser,
      buildUserDefaults({
        email: existingUser.email || syntheticEmail,
        displayName,
        avatarUrl: existingUser.avatarUrl || avatarUrl,
      }),
    ),
  );

  if (!existingUser.email) {
    updates.email = syntheticEmail;
  }
  if (!existingUser.displayName && displayName) {
    updates.displayName = displayName;
  }
  if (!existingUser.avatarUrl && avatarUrl) {
    updates.avatarUrl = avatarUrl;
  }

  await usersCollection.updateOne({ _id: existingUser._id }, { $set: updates });
  return toSessionUser({ ...existingUser, ...updates });
}

const sharedAuthCookieDomain = getSharedAuthCookieDomain();

export const authOptions = {
  trustHost: true,
  ...(sharedAuthCookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            options: {
              httpOnly: true,
              sameSite: 'lax' as const,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              domain: sharedAuthCookieDomain,
            },
          },
        },
      }
    : {}),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = await getDb();
        const email = normalizeEmail(credentials.email);
        const user = await db.collection('users').findOne({ email });
        if (!user || user.status === 'blocked' || user.archivedAt) {
          return null;
        }
        if (!user.passwordHash) {
          throw new Error('RESET_REQUIRED');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash || '');
        if (!isValid) {
          return null;
        }

        const sessionUser = await syncExistingUserForSession(user, 'credentials');
        if (!sessionUser.id) {
          return null;
        }

        return sessionUser;
      },
    }),
    CredentialsProvider({
      id: 'passkey',
      name: 'Passkey',
      credentials: {
        ticket: { label: 'Passkey Ticket', type: 'text' },
      },
      async authorize(credentials) {
        const ticketValue = typeof credentials?.ticket === 'string' ? credentials.ticket.trim() : '';
        if (!ticketValue) {
          return null;
        }

        const ticket = await consumePasskeySignInTicket(ticketValue);
        if (!ticket) {
          return null;
        }

        const db = await getDb();
        const user = await db.collection<any>('users').findOne({ _id: ticket.userId });
        if (!user || user.status === 'blocked' || user.archivedAt) {
          return null;
        }

        const sessionUser = await syncExistingUserForSession(user, 'passkey');
        if (!sessionUser.id) {
          return null;
        }

        return sessionUser;
      },
    }),
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        initData: { label: 'Telegram initData', type: 'text' },
      },
      async authorize(credentials) {
        const initData = typeof credentials?.initData === 'string' ? credentials.initData.trim() : '';
        if (!initData) {
          return null;
        }

        const botToken = getTelegramAuthToken();
        if (!botToken) {
          throw new Error('Telegram auth is not configured.');
        }

        validateTelegramInitData(initData, botToken, { expiresIn: 3600 });
        const parsed = parseTelegramInitData(initData);
        if (!parsed.user) {
          throw new Error('Telegram did not return user data.');
        }

        return syncTelegramUser(parsed.user as Record<string, any>);
      },
    }),
    ...(isGoogleAuthEnabled()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            authorization: {
              params: {
                prompt: 'select_account',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
    ...(isAppleAuthEnabled()
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID as string,
            clientSecret: process.env.APPLE_SECRET as string,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const nextToken = token as any;
      if (account?.provider === 'google') {
        const linkedUser = await syncGoogleUser(profile as Record<string, any>, account as Record<string, any>);
        nextToken.id = linkedUser.id;
        nextToken.systemRole = linkedUser.systemRole;
        nextToken.plan = linkedUser.plan;
        nextToken.isPartner = linkedUser.isPartner;
        nextToken.image = linkedUser.image || null;
        nextToken.authProvider = 'google';
      } else if (user) {
        nextToken.id = normalizeId(user.id);
        nextToken.systemRole = (user as any).systemRole;
        nextToken.plan = (user as any).plan;
        nextToken.isPartner = !!(user as any).isPartner;
        nextToken.image = (user as any).image || null;
        nextToken.authProvider = (user as any).authProvider || account?.provider || 'credentials';
      }

      if (!nextToken.id && nextToken.sub) {
        nextToken.id = normalizeId(nextToken.sub);
      } else if (nextToken.id) {
        nextToken.id = normalizeId(nextToken.id);
      }

      return nextToken;
    },
    async session({ session, token }) {
      if (session.user) {
        const normalizedId = normalizeId((token as any).id || token.sub);
        if (!normalizedId) {
          throw new Error('Invalid session token: missing user id');
        }
        session.user.id = normalizedId;
        (session.user as any).systemRole = token.systemRole;
        (session.user as any).plan = token.plan;
        (session.user as any).isPartner = !!(token as any).isPartner;
        (session.user as any).image = (token as any).image || null;
        (session.user as any).authProvider = (token as any).authProvider || 'credentials';
      }
      return session;
    },
  },
} as NextAuthOptions;
