import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import VKProvider from 'next-auth/providers/vk';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { parse as parseTelegramInitData, validate as validateTelegramInitData } from '@tma.js/init-data-node';
import { getDb } from '@/lib/mongodb';
import { readAiConfigSync } from '@/lib/ai-config-runtime';
import { consumePasskeySignInTicket } from '@/lib/passkeys/store';
import { normalizeEmail, resolveIdentifier } from '@/lib/auth-identifiers';
import { validateTelegramWebPayload } from '@/lib/telegram-web';
import { getTelegramRuntimeConfig } from '@/lib/telegram/runtime';
import { resolveVkIdentity } from '@/lib/vk-auth';

function normalizeId(id: any): string {
  if (typeof id === 'string') return id;
  if (id == null) return '';
  if (typeof id.toString === 'function') return id.toString();
  return String(id);
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
  const { apiModels } = readAiConfigSync() as any;
  const defaultModel = apiModels.find((m: any) => m.isDefault) || apiModels[0];
  return defaultModel?.value || 'google/gemini-3-flash-preview';
}

function buildUserDefaults(params: {
  email: string;
  phone?: string | null;
  phoneNormalized?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const emailPrefix = params.email.split('@')[0] || 'Пользователь';
  const now = new Date();

  return {
    displayName: params.displayName?.trim() || emailPrefix,
    phone: params.phone || '',
    phoneNormalized: params.phoneNormalized || '',
    phoneVerified: false,
    telegramUsername: '',
    telegramChatId: null,
    telegramLinkedAt: null,
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
    vkId: null,
    vkUsername: '',
    vkLinkedAt: null,
    vkPhotoUrl: null,
    vkPeerId: null,
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

type RuntimeAuthProvider = 'credentials' | 'passkey' | 'telegram' | 'vk';

async function syncExistingUserForSession(user: Record<string, any>, provider: RuntimeAuthProvider) {
  const db = await getDb();
  const email = normalizeEmail(user.email);
  const updates = getMissingDefaults(
    user,
    buildUserDefaults({
      email,
      phone: user.phone,
      phoneNormalized: user.phoneNormalized,
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

export function isVkAuthEnabled(): boolean {
  return Boolean(process.env.VK_ID_CLIENT_ID?.trim() && process.env.VK_ID_CLIENT_SECRET?.trim());
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

async function syncVkUser(profile: Record<string, any>, account?: Record<string, any>) {
  const {
    vkId,
    email,
    displayName,
    vkUsername,
    vkPhotoUrl: avatarUrl,
  } = resolveVkIdentity(profile, account);

  const db = await getDb();
  const usersCollection = db.collection('users');
  const now = new Date();

  const existingByVk = await usersCollection.findOne({ vkId });
  const existingByEmail = existingByVk ? null : await usersCollection.findOne({ email });
  const existingUser = existingByVk || existingByEmail;

  if (existingUser?.status === 'blocked' || existingUser?.archivedAt) {
    throw new Error('Аккаунт заблокирован. Обратитесь к администратору.');
  }

  if (!existingUser) {
    const userId = nanoid();
    const userData: any = {
      _id: userId,
      email,
      ...buildUserDefaults({ email, displayName, avatarUrl }),
      displayName,
      avatarUrl,
      vkId,
      vkUsername,
      vkPhotoUrl: avatarUrl,
      vkLinkedAt: now,
      authProvider: 'vk',
      lastLoginAt: now,
      updatedAt: now,
    };

    await usersCollection.insertOne(userData);
    return toSessionUser(userData);
  }

  const updates: Record<string, any> = {
    updatedAt: now,
    lastLoginAt: now,
    authProvider: 'vk',
    vkId,
    vkUsername: vkUsername || existingUser.vkUsername || '',
    vkPhotoUrl: avatarUrl || existingUser.vkPhotoUrl || existingUser.avatarUrl || null,
    vkLinkedAt: existingUser.vkLinkedAt || now,
  };

  Object.assign(
    updates,
    getMissingDefaults(
      existingUser,
      buildUserDefaults({
        email,
        phone: existingUser.phone,
        phoneNormalized: existingUser.phoneNormalized,
        displayName,
        avatarUrl: existingUser.avatarUrl || avatarUrl,
      }),
    ),
  );

  if (!existingUser.email) {
    updates.email = email;
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
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const db = await getDb();
        const identifier = resolveIdentifier(credentials.identifier);
        const query =
          identifier.type === 'email'
            ? { email: identifier.value }
            : identifier.type === 'phone'
              ? { phoneNormalized: identifier.value }
              : null;
        if (!query) {
          return null;
        }

        const user = await db.collection('users').findOne(query);
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
      id: 'telegram-miniapp',
      name: 'Telegram Mini App',
      credentials: {
        initData: { label: 'Telegram initData', type: 'text' },
      },
      async authorize(credentials) {
        const initData = typeof credentials?.initData === 'string' ? credentials.initData.trim() : '';
        if (!initData) {
          return null;
        }

        const runtime = await getTelegramRuntimeConfig();
        const botToken = runtime.authToken;
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
    CredentialsProvider({
      id: 'telegram-web',
      name: 'Telegram Web',
      credentials: {
        id: { label: 'Telegram user id', type: 'text' },
        first_name: { label: 'First name', type: 'text' },
        last_name: { label: 'Last name', type: 'text' },
        username: { label: 'Username', type: 'text' },
        photo_url: { label: 'Photo URL', type: 'text' },
        auth_date: { label: 'Auth date', type: 'text' },
        hash: { label: 'Hash', type: 'text' },
      },
      async authorize(credentials) {
        const runtime = await getTelegramRuntimeConfig();
        const botToken = runtime.authToken;
        if (!botToken) {
          throw new Error('Telegram auth is not configured.');
        }

        const validated = validateTelegramWebPayload(credentials as Record<string, unknown>, botToken, 3600);
        return syncTelegramUser(validated as Record<string, any>);
      },
    }),
    ...(isVkAuthEnabled()
      ? [
          VKProvider({
            clientId: process.env.VK_ID_CLIENT_ID as string,
            clientSecret: process.env.VK_ID_CLIENT_SECRET as string,
            authorization: {
              params: {
                scope: 'email',
                v: '5.131',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const nextToken = token as any;
      if (account?.provider === 'vk') {
        const linkedUser = await syncVkUser(profile as Record<string, any>, account as Record<string, any>);
        nextToken.id = linkedUser.id;
        nextToken.systemRole = linkedUser.systemRole;
        nextToken.plan = linkedUser.plan;
        nextToken.isPartner = linkedUser.isPartner;
        nextToken.image = linkedUser.image || null;
        nextToken.authProvider = 'vk';
      } else if (user) {
        nextToken.id = normalizeId(user.id);
        nextToken.systemRole = (user as any).systemRole;
        nextToken.plan = (user as any).plan;
        nextToken.isPartner = !!(user as any).isPartner;
        nextToken.image = (user as any).image || null;
        const provider = (user as any).authProvider || account?.provider || 'credentials';
        nextToken.authProvider = provider === 'telegram-miniapp' || provider === 'telegram-web' ? 'telegram' : provider;
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
