'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  beginPasskeyAuthentication,
  beginPasskeyRegistration,
  completePasskeyAuthentication,
  completePasskeyRegistration,
  deleteCurrentUserPasskey,
  listCurrentUserPasskeys,
} from '@/lib/passkeys/service';
import type {
  PasskeyAuthenticationOptionsResponse,
  PasskeyAuthenticationResponsePayload,
  PasskeyCredentialSummary,
  PasskeyRegistrationOptionsResponse,
  PasskeyRegistrationResponsePayload,
} from '@/types/passkey';

async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Требуется активная сессия пользователя.');
  }
  return session.user;
}

export async function createPasskeyRegistrationOptionsAction(input?: { nickname?: string | null }) {
  const user = await requireSessionUser();
  return beginPasskeyRegistration({
    userId: user.id,
    userEmail: user.email ?? null,
    displayName: user.name ?? null,
    nickname: input?.nickname ?? null,
  });
}

export async function completePasskeyRegistrationAction(payload: PasskeyRegistrationResponsePayload) {
  const user = await requireSessionUser();
  return completePasskeyRegistration({
    ...payload,
    userId: user.id,
  });
}

export async function createPasskeyAuthenticationOptionsAction(input?: { identifier?: string | null }) {
  return beginPasskeyAuthentication({
    identifier: input?.identifier ?? null,
  });
}

export async function completePasskeyAuthenticationAction(payload: PasskeyAuthenticationResponsePayload) {
  return completePasskeyAuthentication(payload);
}

export async function listPasskeyCredentialsAction(): Promise<PasskeyCredentialSummary[]> {
  const user = await requireSessionUser();
  return listCurrentUserPasskeys(user.id);
}

export async function deletePasskeyCredentialAction(input: { credentialId: string }) {
  const user = await requireSessionUser();
  return deleteCurrentUserPasskey(user.id, input.credentialId);
}

export type {
  PasskeyAuthenticationOptionsResponse,
  PasskeyRegistrationOptionsResponse,
};
