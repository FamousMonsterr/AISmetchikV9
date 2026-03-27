import type {
  PasskeyAuthenticationOptionsResponse,
  PasskeyAuthenticationResponsePayload,
  PasskeyCreationOptions,
  PasskeyRegistrationOptionsResponse,
  PasskeyRegistrationResponsePayload,
  PasskeyRequestOptions,
  PasskeyCredentialSummary,
} from '@/types/passkey';
import { resolvePasskeyConfig } from '@/lib/passkeys/config';
import {
  createPasskeyChallenge,
  cosePublicKeyToJwk,
  isPasskeyChallengeMatch,
  isPasskeyOriginMatch,
  normalizeCredentialId,
  parseAttestationObject,
  parseAuthenticatorData,
  parseClientDataJSON,
  rpIdHashFor,
  verifyPasskeyAssertion,
} from '@/lib/passkeys/webauthn';
import {
  consumePasskeyChallenge,
  createPasskeySignInTicket,
  findPasskeyChallenge,
  findPasskeyCredentialByCredentialId,
  findPasskeyCredentialByUserIdAndCredentialId,
  findPasskeyUserByIdentifier,
  insertPasskeyChallenge,
  insertPasskeyCredential,
  listPasskeyCredentialsForUser,
  markPasskeyCredentialUsed,
  passkeyCollections,
  revokePasskeyCredential,
  updatePasskeyChallenge,
} from '@/lib/passkeys/store';
import { toBase64Url } from '@/lib/passkeys/encoding';

function toCredentialDescriptor(credentialId: string, transports?: string[]) {
  return {
    type: 'public-key' as const,
    id: credentialId,
    transports,
  };
}

export async function beginPasskeyRegistration(input: {
  userId: string;
  userEmail?: string | null;
  displayName?: string | null;
  nickname?: string | null;
  requestOrigin?: string | null;
}) {
  const config = resolvePasskeyConfig(input.requestOrigin);
  const challenge = createPasskeyChallenge();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.challengeTtlMs);
  const credentialList = await listPasskeyCredentialsForUser(input.userId);

  const challengeRecord = await insertPasskeyChallenge({
    kind: 'registration',
    challenge,
    rpId: config.rpId,
    origin: config.origin,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    identifier: input.userEmail ?? input.userId,
    nickname: input.nickname ?? null,
    userVerification: config.userVerification,
    createdAt: now,
    expiresAt,
    usedAt: null,
    metadata: {
      displayName: input.displayName ?? null,
    },
  });

  const publicKey: PasskeyCreationOptions = {
    rp: { name: config.rpName, id: config.rpId },
    user: {
      id: toBase64Url(Buffer.from(input.userId, 'utf8')),
      name: input.userEmail || input.userId,
      displayName: input.displayName || input.userEmail || 'Пользователь',
    },
    challenge,
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
    ],
    timeout: config.timeoutMs,
    attestation: config.attestation,
    authenticatorSelection: {
      residentKey: 'preferred',
      requireResidentKey: false,
      userVerification: config.userVerification,
    },
    excludeCredentials: credentialList
      .filter((item: PasskeyCredentialSummary) => !item.revokedAt)
      .map((item: PasskeyCredentialSummary) => toCredentialDescriptor(item.credentialId, item.transports)),
  };

  const response: PasskeyRegistrationOptionsResponse = {
    kind: 'registration',
    challengeId: challengeRecord._id,
    challenge,
    expiresAt: expiresAt.toISOString(),
    rpId: config.rpId,
    origin: config.origin,
    publicKey,
  };

  return response;
}

export async function completePasskeyRegistration(input: PasskeyRegistrationResponsePayload & { requestOrigin?: string | null; userId: string }) {
  const challengeRecord = await findPasskeyChallenge(input.challengeId);
  if (!challengeRecord) {
    throw new Error('Passkey registration challenge was not found.');
  }
  if (challengeRecord.kind !== 'registration') {
    throw new Error('Challenge kind mismatch.');
  }
  if (challengeRecord.usedAt) {
    throw new Error('Passkey registration challenge has already been used.');
  }

  const config = resolvePasskeyConfig(input.requestOrigin || challengeRecord.origin);
  if (challengeRecord.userId && challengeRecord.userId !== input.userId) {
    throw new Error('Challenge was issued for another user.');
  }

  const clientData = parseClientDataJSON(input.credential.response.clientDataJSON);
  if (!isPasskeyChallengeMatch(challengeRecord.challenge, clientData.challenge)) {
    throw new Error('Passkey registration challenge does not match.');
  }
  if (!isPasskeyOriginMatch(config.origin, clientData.origin)) {
    throw new Error('Passkey registration origin does not match.');
  }
  if (clientData.type !== 'webauthn.create') {
    throw new Error('Invalid clientDataJSON type for registration.');
  }

  const attestation = parseAttestationObject(input.credential.response.attestationObject);
  const authenticatorData = parseAuthenticatorData(attestation.authData);
  if (!authenticatorData.flags.attestedCredentialDataIncluded) {
    throw new Error('Authenticator data does not contain attested credential data.');
  }
  if (!authenticatorData.flags.userPresent) {
    throw new Error('User presence was not asserted.');
  }

  const expectedRpHash = rpIdHashFor(config.rpId);
  if (!authenticatorData.rpIdHash.equals(expectedRpHash)) {
    throw new Error('RP ID hash mismatch.');
  }

  const credentialId = authenticatorData.credentialId?.length
    ? toBase64Url(authenticatorData.credentialId)
    : normalizeCredentialId(input.credential.rawId || input.credential.id);
  const publicKeyJwk = cosePublicKeyToJwk(authenticatorData.credentialPublicKey || {});
  const existingCredential = await findPasskeyCredentialByCredentialId(credentialId);
  if (existingCredential && !existingCredential.revokedAt) {
    throw new Error('This passkey credential is already registered.');
  }

  const storedCredential = await insertPasskeyCredential({
    userId: input.userId,
    credentialId,
    publicKeyJwk,
    rpId: config.rpId,
    origin: config.origin,
    counter: authenticatorData.signCount || 0,
    transports: input.credential.response.transports || [],
    nickname: input.nickname ?? challengeRecord.nickname ?? null,
    attestationFormat: attestation.fmt || null,
    aaguid: authenticatorData.aaguid ? toBase64Url(authenticatorData.aaguid) : null,
    deviceType: 'passkey',
    backedUp: authenticatorData.flags.backedUp,
    backupEligible: authenticatorData.flags.backupEligible,
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  });

  await consumePasskeyChallenge(challengeRecord._id);
  await updatePasskeyChallenge(challengeRecord._id, {
    metadata: {
      ...(challengeRecord.metadata || {}),
      registeredCredentialId: storedCredential.credentialId,
    },
  });

  return {
    ok: true,
    credential: {
      credentialId: storedCredential.credentialId,
      nickname: storedCredential.nickname ?? null,
      createdAt: storedCredential.createdAt.toISOString(),
    },
  };
}

export async function beginPasskeyAuthentication(input: {
  identifier?: string | null;
  requestOrigin?: string | null;
}) {
  const config = resolvePasskeyConfig(input.requestOrigin);
  const challenge = createPasskeyChallenge();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.challengeTtlMs);

  const resolvedUser = input.identifier ? await findPasskeyUserByIdentifier(input.identifier) : null;
  if (input.identifier && !resolvedUser) {
    throw new Error('User was not found for the provided identifier.');
  }

  const allowedCredentials = resolvedUser
    ? await listPasskeyCredentialsForUser(resolvedUser._id)
    : [];
  if (resolvedUser && allowedCredentials.length === 0) {
    throw new Error('No passkeys are registered for this user yet.');
  }

  const challengeRecord = await insertPasskeyChallenge({
    kind: 'authentication',
    challenge,
    rpId: config.rpId,
    origin: config.origin,
    userId: resolvedUser?._id ?? null,
    userEmail: resolvedUser?.email ?? input.identifier ?? null,
    identifier: input.identifier ?? null,
    nickname: null,
    userVerification: config.userVerification,
    createdAt: now,
    expiresAt,
    usedAt: null,
    metadata: {},
  });

  const publicKey: PasskeyRequestOptions = {
    rpId: config.rpId,
    challenge,
    timeout: config.timeoutMs,
    userVerification: config.userVerification,
    allowCredentials: allowedCredentials
      .filter((item: PasskeyCredentialSummary) => !item.revokedAt)
      .map((item: PasskeyCredentialSummary) => toCredentialDescriptor(item.credentialId, item.transports)),
  };

  const response: PasskeyAuthenticationOptionsResponse = {
    kind: 'authentication',
    challengeId: challengeRecord._id,
    challenge,
    expiresAt: expiresAt.toISOString(),
    rpId: config.rpId,
    origin: config.origin,
    publicKey,
    resolvedUserId: resolvedUser?._id ?? null,
  };

  return response;
}

export async function completePasskeyAuthentication(input: PasskeyAuthenticationResponsePayload & { requestOrigin?: string | null }) {
  const challengeRecord = await findPasskeyChallenge(input.challengeId);
  if (!challengeRecord) {
    throw new Error('Passkey authentication challenge was not found.');
  }
  if (challengeRecord.kind !== 'authentication') {
    throw new Error('Challenge kind mismatch.');
  }
  if (challengeRecord.usedAt) {
    throw new Error('Passkey authentication challenge has already been used.');
  }

  const config = resolvePasskeyConfig(input.requestOrigin || challengeRecord.origin);
  const clientData = parseClientDataJSON(input.credential.response.clientDataJSON);
  if (!isPasskeyChallengeMatch(challengeRecord.challenge, clientData.challenge)) {
    throw new Error('Passkey authentication challenge does not match.');
  }
  if (!isPasskeyOriginMatch(config.origin, clientData.origin)) {
    throw new Error('Passkey authentication origin does not match.');
  }
  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid clientDataJSON type for authentication.');
  }

  const credentialId = normalizeCredentialId(input.credential.rawId || input.credential.id);
  const credential = challengeRecord.userId
    ? await findPasskeyCredentialByUserIdAndCredentialId(challengeRecord.userId, credentialId)
    : await findPasskeyCredentialByCredentialId(credentialId);

  if (!credential || credential.revokedAt) {
    throw new Error('Passkey credential was not found.');
  }

  const authenticatorData = parseAuthenticatorData(input.credential.response.authenticatorData);
  const expectedRpHash = rpIdHashFor(config.rpId);
  if (!authenticatorData.rpIdHash.equals(expectedRpHash)) {
    throw new Error('RP ID hash mismatch.');
  }
  if (!authenticatorData.flags.userPresent) {
    throw new Error('User presence was not asserted.');
  }
  if (config.userVerification === 'required' && !authenticatorData.flags.userVerified) {
    throw new Error('User verification is required for this passkey flow.');
  }

  const signatureValid = verifyPasskeyAssertion({
    publicKeyJwk: credential.publicKeyJwk,
    authenticatorData: input.credential.response.authenticatorData,
    clientDataJSON: input.credential.response.clientDataJSON,
    signature: input.credential.response.signature,
  });

  if (!signatureValid) {
    throw new Error('Passkey signature verification failed.');
  }

  const nextCounter = authenticatorData.signCount || credential.counter || 0;
  if (credential.counter > 0 && nextCounter > 0 && nextCounter <= credential.counter) {
    throw new Error('Passkey sign counter did not increase.');
  }

  await markPasskeyCredentialUsed(credential.credentialId, Math.max(credential.counter || 0, nextCounter));
  await consumePasskeyChallenge(challengeRecord._id);
  await updatePasskeyChallenge(challengeRecord._id, {
    metadata: {
      ...(challengeRecord.metadata || {}),
      authenticatedCredentialId: credential.credentialId,
    },
  });
  const signInTicket = await createPasskeySignInTicket({
    token: createPasskeyChallenge(48),
    userId: credential.userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60_000),
    usedAt: null,
  });

  return {
    ok: true,
    userId: credential.userId,
    credentialId: credential.credentialId,
    signInToken: signInTicket.token,
  };
}

export async function listCurrentUserPasskeys(userId: string): Promise<PasskeyCredentialSummary[]> {
  return listPasskeyCredentialsForUser(userId);
}

export async function deleteCurrentUserPasskey(userId: string, credentialId: string) {
  await revokePasskeyCredential(userId, credentialId);
  return { ok: true };
}

export const passkeyStorageModel = {
  collections: passkeyCollections,
  challengeTtlMinutes: 5,
  credentialFields: [
    'credentialId',
    'publicKeyJwk',
    'counter',
    'transports',
    'nickname',
    'rpId',
    'origin',
    'createdAt',
    'lastUsedAt',
    'revokedAt',
  ],
};
