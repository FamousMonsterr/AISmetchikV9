// @ts-nocheck
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import modelsConfig from '@/lib/ai-config.json';

function normalizeId(id: any): string {
  if (typeof id === 'string') return id;
  if (id == null) return '';
  if (typeof id.toString === 'function') return id.toString();
  return String(id);
}

export const authOptions: NextAuthOptions = {
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
        const email = credentials.email.toLowerCase();
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

        const updates: Record<string, any> = {};
        const { apiModels } = modelsConfig as any;
        const defaultModel = apiModels.find((m: any) => m.isDefault) || apiModels[0];

        if (!user.displayName) {
          updates.displayName = email.split('@')[0] || 'Пользователь';
        }
        if (!user.systemRole) {
          updates.systemRole = 'User';
        }
        if (!user.plan) {
          updates.plan = 'Free';
        }
        if (!user.status) {
          updates.status = 'active';
        }
        if (!user.createdAt) {
          updates.createdAt = new Date();
        }
        if (!user.availableModels || !Array.isArray(user.availableModels) || user.availableModels.length === 0) {
          updates.availableModels = [defaultModel.value];
        }
        if (user.maxCompanies == null) {
          updates.maxCompanies = 1;
        }
        if (user.maxActiveProjects == null) {
          updates.maxActiveProjects = 10;
        }
        if (user.maxDraftsPerProject == null) {
          updates.maxDraftsPerProject = 3;
        }
        if (user.canShareProjects == null) {
          updates.canShareProjects = false;
        }
        if (user.canUsePrivatePriceBase == null) {
          updates.canUsePrivatePriceBase = false;
        }
        if (user.canGroupProjects == null) {
          updates.canGroupProjects = false;
        }

        if (Object.keys(updates).length) {
          await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
        }

        const userId = normalizeId(user._id);
        if (!userId) {
          return null;
        }

        return {
          id: userId,
          email: user.email,
          name: user.displayName,
          systemRole: user.systemRole,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = normalizeId(user.id);
        token.systemRole = (user as any).systemRole;
        token.plan = (user as any).plan;
      }
      if (!token.id && token.sub) {
        token.id = normalizeId(token.sub);
      } else if (token.id) {
        token.id = normalizeId(token.id);
      }
      return token;
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
      }
      return session;
    },
  },
};
