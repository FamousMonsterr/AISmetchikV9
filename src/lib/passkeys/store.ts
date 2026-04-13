import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import type {
  PasskeyChallengeRecord,
  PasskeyCredentialRecord,
  PasskeyCredentialSummary,
  PasskeySignInTicketRecord,
} from '@/types/passkey';

const CHALLENGES_COLLECTION = 'passkey_challenges';
const CREDENTIALS_COLLECTION = 'passkey_credentials';
const SIGNIN_TICKETS_COLLECTION = 'passkey_signin_tickets';

export async function insertPasskeyChallenge(record: Omit<PasskeyChallengeRecord, '_id'>) {
  const db = await getDb();
  const _id = nanoid();
  await db.collection<any>(CHALLENGES_COLLECTION).insertOne({ _id, ...record });
  return { ...record, _id } satisfies PasskeyChallengeRecord;
}

export async function updatePasskeyChallenge(id: string, patch: Partial<PasskeyChallengeRecord>) {
  const db = await getDb();
  await db.collection<any>(CHALLENGES_COLLECTION).updateOne({ _id: id }, { $set: patch });
}

export async function findPasskeyChallenge(id: string) {
  const db = await getDb();
  const doc = await db.collection<any>(CHALLENGES_COLLECTION).findOne({ _id: id });
  if (!doc) return null;
  return {
    ...doc,
    _id: String(doc._id),
    userId: doc.userId == null ? null : String(doc.userId),
  } as PasskeyChallengeRecord;
}

export async function consumePasskeyChallenge(id: string) {
  await updatePasskeyChallenge(id, { usedAt: new Date() });
}

export async function insertPasskeyCredential(record: Omit<PasskeyCredentialRecord, '_id'>) {
  const db = await getDb();
  const _id = nanoid();
  await db.collection<any>(CREDENTIALS_COLLECTION).insertOne({ _id, ...record });
  return { ...record, _id } satisfies PasskeyCredentialRecord;
}

export async function findPasskeyCredentialByCredentialId(credentialId: string) {
  const db = await getDb();
  const doc = await db.collection<any>(CREDENTIALS_COLLECTION).findOne({ credentialId });
  if (!doc) return null;
  return {
    ...doc,
    _id: String(doc._id),
    userId: String(doc.userId),
  } as PasskeyCredentialRecord;
}

export async function findPasskeyCredentialByUserIdAndCredentialId(userId: string, credentialId: string) {
  const db = await getDb();
  const doc = await db.collection<any>(CREDENTIALS_COLLECTION).findOne({ userId, credentialId });
  if (!doc) return null;
  return {
    ...doc,
    _id: String(doc._id),
    userId: String(doc.userId),
  } as PasskeyCredentialRecord;
}

export async function listPasskeyCredentialsForUser(userId: string) {
  const db = await getDb();
  const docs = await db.collection<any>(CREDENTIALS_COLLECTION)
    .find({ userId, revokedAt: null })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc: any) => ({
    credentialId: doc.credentialId,
    nickname: doc.nickname ?? null,
    counter: doc.counter ?? 0,
    transports: Array.isArray(doc.transports) ? doc.transports : [],
    createdAt: new Date(doc.createdAt || new Date()).toISOString(),
    lastUsedAt: doc.lastUsedAt ? new Date(doc.lastUsedAt).toISOString() : null,
    rpId: doc.rpId,
    origin: doc.origin,
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
  })) satisfies PasskeyCredentialSummary[];
}

export async function markPasskeyCredentialUsed(credentialId: string, counter: number) {
  const db = await getDb();
  await db.collection<any>(CREDENTIALS_COLLECTION).updateOne(
    { credentialId },
    {
      $set: {
        counter,
        lastUsedAt: new Date(),
      },
    },
  );
}

export async function revokePasskeyCredential(userId: string, credentialId: string) {
  const db = await getDb();
  const result = await db.collection<any>(CREDENTIALS_COLLECTION).updateOne(
    { userId, credentialId },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
  return result.modifiedCount > 0;
}

export async function findPasskeyUserByIdentifier(identifier: string) {
  const db = await getDb();
  const normalized = identifier.trim().toLowerCase();
  const userByEmail = await db.collection<any>('users').findOne({ email: normalized });
  if (userByEmail) {
    return { ...userByEmail, _id: String(userByEmail._id) };
  }
  const userById = await db.collection<any>('users').findOne({ _id: identifier.trim() });
  return userById ? { ...userById, _id: String(userById._id) } : null;
}

export async function createPasskeySignInTicket(record: Omit<PasskeySignInTicketRecord, '_id'>) {
  const db = await getDb();
  const _id = nanoid();
  await db.collection<any>(SIGNIN_TICKETS_COLLECTION).insertOne({ _id, ...record });
  return { ...record, _id } satisfies PasskeySignInTicketRecord;
}

export async function consumePasskeySignInTicket(token: string) {
  const db = await getDb();
  const ticket = await db.collection<any>(SIGNIN_TICKETS_COLLECTION).findOne({ token });
  if (!ticket) {
    return null;
  }
  if (ticket.usedAt || new Date(ticket.expiresAt) <= new Date()) {
    return null;
  }

  const usedAt = new Date();
  await db.collection<any>(SIGNIN_TICKETS_COLLECTION).updateOne(
    { _id: ticket._id, usedAt: null },
    { $set: { usedAt } },
  );

  return {
    ...ticket,
    _id: String(ticket._id),
    userId: String(ticket.userId),
    createdAt: new Date(ticket.createdAt),
    expiresAt: new Date(ticket.expiresAt),
    usedAt,
  } as PasskeySignInTicketRecord;
}

export const passkeyCollections = {
  challenges: CHALLENGES_COLLECTION,
  credentials: CREDENTIALS_COLLECTION,
  signInTickets: SIGNIN_TICKETS_COLLECTION,
};
