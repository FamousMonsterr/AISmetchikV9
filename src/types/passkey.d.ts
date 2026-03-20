export type PasskeyFlowKind = 'registration' | 'authentication';
export type PasskeyUserVerification = 'preferred' | 'required' | 'discouraged';
export type PasskeyCredentialType = 'public-key';

export interface PasskeyRelyingPartyConfig {
  rpId: string;
  rpName: string;
  origin: string;
  timeoutMs: number;
  challengeTtlMs: number;
  userVerification: PasskeyUserVerification;
  attestation: 'none' | 'indirect' | 'direct';
}

export interface PasskeyChallengeRecord {
  _id: string;
  kind: PasskeyFlowKind;
  challenge: string;
  rpId: string;
  origin: string;
  userId?: string | null;
  userEmail?: string | null;
  identifier?: string | null;
  nickname?: string | null;
  userVerification: PasskeyUserVerification;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface PasskeyCredentialRecord {
  _id: string;
  userId: string;
  credentialId: string;
  publicKeyJwk: JsonWebKey;
  rpId: string;
  origin: string;
  counter: number;
  transports: string[];
  nickname?: string | null;
  attestationFormat?: string | null;
  aaguid?: string | null;
  deviceType?: string | null;
  backedUp?: boolean | null;
  backupEligible?: boolean | null;
  createdAt: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
}

export interface PasskeySignInTicketRecord {
  _id: string;
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface PasskeyCredentialSummary {
  credentialId: string;
  nickname?: string | null;
  counter: number;
  transports: string[];
  createdAt: string;
  lastUsedAt?: string | null;
  rpId: string;
  origin: string;
  revokedAt?: string | null;
}

export interface PasskeyCreationOptions {
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: PasskeyCredentialType; alg: number }>;
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
  authenticatorSelection: {
    residentKey: 'preferred' | 'required' | 'discouraged';
    userVerification: PasskeyUserVerification;
    requireResidentKey: boolean;
  };
  excludeCredentials: Array<{ type: PasskeyCredentialType; id: string; transports?: string[] }>;
  extensions?: Record<string, unknown>;
}

export interface PasskeyRequestOptions {
  rpId: string;
  challenge: string;
  timeout: number;
  userVerification: PasskeyUserVerification;
  allowCredentials: Array<{ type: PasskeyCredentialType; id: string; transports?: string[] }>;
  extensions?: Record<string, unknown>;
}

export interface PasskeyRegistrationOptionsResponse {
  kind: 'registration';
  challengeId: string;
  challenge: string;
  expiresAt: string;
  rpId: string;
  origin: string;
  publicKey: PasskeyCreationOptions;
}

export interface PasskeyAuthenticationOptionsResponse {
  kind: 'authentication';
  challengeId: string;
  challenge: string;
  expiresAt: string;
  rpId: string;
  origin: string;
  publicKey: PasskeyRequestOptions;
  resolvedUserId?: string | null;
}

export interface PasskeyRegistrationResponsePayload {
  challengeId: string;
  nickname?: string | null;
  credential: {
    id: string;
    rawId: string;
    type: PasskeyCredentialType;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    clientExtensionResults?: Record<string, unknown>;
  };
}

export interface PasskeyAuthenticationVerifyResponse {
  ok: true;
  userId: string;
  credentialId: string;
  signInToken: string;
}

export interface PasskeyAuthenticationResponsePayload {
  challengeId: string;
  credential: {
    id: string;
    rawId: string;
    type: PasskeyCredentialType;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string | null;
    };
    clientExtensionResults?: Record<string, unknown>;
  };
}

export interface PasskeyBrowserRegistrationOptions {
  publicKey: PasskeyCreationOptions;
}

export interface PasskeyBrowserAuthenticationOptions {
  publicKey: PasskeyRequestOptions;
}

export interface PasskeyBrowserCreationCredential {
  id: string;
  rawId: string;
  type: PasskeyCredentialType;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
  clientExtensionResults?: Record<string, unknown>;
}

export interface PasskeyBrowserAssertionCredential {
  id: string;
  rawId: string;
  type: PasskeyCredentialType;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
  clientExtensionResults?: Record<string, unknown>;
}
