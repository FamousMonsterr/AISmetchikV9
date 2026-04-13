import { createHash, createPublicKey, createVerify, randomBytes } from 'node:crypto';
import { decodeCbor } from '@/lib/passkeys/cbor';
import { bytesFromBase64Url, fromBase64Url, toBase64Url } from '@/lib/passkeys/encoding';

export type PasskeyClientData = {
  type: 'webauthn.create' | 'webauthn.get';
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
  [key: string]: unknown;
};

export type PasskeyAuthenticatorData = {
  rpIdHash: Buffer;
  flags: {
    userPresent: boolean;
    userVerified: boolean;
    attestedCredentialDataIncluded: boolean;
    extensionDataIncluded: boolean;
    backupEligible: boolean;
    backedUp: boolean;
  };
  signCount: number;
  credentialId?: Buffer;
  credentialPublicKey?: Record<string, any>;
  aaguid?: Buffer;
};

export type PasskeyRegistrationVerificationInput = {
  challenge: string;
  origin: string;
  rpId: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
  };
};

export type PasskeyAuthenticationVerificationInput = {
  challenge: string;
  origin: string;
  rpId: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string | null;
    };
  };
};

export function createPasskeyChallenge(size = 32) {
  return toBase64Url(randomBytes(size));
}

export function parseClientDataJSON(clientDataJSON: string): PasskeyClientData {
  const raw = fromBase64Url(clientDataJSON).toString('utf8');
  return JSON.parse(raw) as PasskeyClientData;
}

export function parseAuthenticatorData(authenticatorData: string | Buffer): PasskeyAuthenticatorData {
  const buffer = Buffer.isBuffer(authenticatorData) ? authenticatorData : fromBase64Url(authenticatorData);
  if (buffer.length < 37) {
    throw new Error('Authenticator data is too short.');
  }

  const rpIdHash = buffer.subarray(0, 32);
  const flagsByte = buffer.readUInt8(32);
  const signCount = buffer.readUInt32BE(33);

  const flags = {
    userPresent: !!(flagsByte & 0x01),
    userVerified: !!(flagsByte & 0x04),
    backupEligible: !!(flagsByte & 0x08),
    backedUp: !!(flagsByte & 0x10),
    attestedCredentialDataIncluded: !!(flagsByte & 0x40),
    extensionDataIncluded: !!(flagsByte & 0x80),
  };

  let offset = 37;
  let credentialId: Buffer | undefined;
  let credentialPublicKey: Record<string, any> | undefined;
  let aaguid: Buffer | undefined;

  if (flags.attestedCredentialDataIncluded) {
    if (buffer.length < offset + 18) {
      throw new Error('Attested credential data is too short.');
    }
    aaguid = buffer.subarray(offset, offset + 16);
    offset += 16;
    const credentialIdLength = buffer.readUInt16BE(offset);
    offset += 2;
    credentialId = buffer.subarray(offset, offset + credentialIdLength);
    offset += credentialIdLength;
    const publicKey = decodeCbor(buffer, offset);
    credentialPublicKey = publicKey.value as Record<string, any>;
  }

  return {
    rpIdHash,
    flags,
    signCount,
    credentialId,
    credentialPublicKey,
    aaguid,
  };
}

export function parseAttestationObject(attestationObject: string) {
  const decoded = decodeCbor(fromBase64Url(attestationObject));
  const value = decoded.value as Record<string, any>;
  return {
    fmt: String(value.fmt || ''),
    attStmt: value.attStmt || {},
    authData: Buffer.isBuffer(value.authData) ? value.authData : fromBase64Url(String(value.authData || '')),
  };
}

export function cosePublicKeyToJwk(coseKey: Record<string, any>): JsonWebKey {
  const kty = coseKey['1'];
  const alg = coseKey['3'];
  const crv = coseKey['-1'];
  const x = coseKey['-2'];
  const y = coseKey['-3'];

  if (kty !== 2 || alg !== -7 || crv !== 1 || !x || !y) {
    throw new Error('Only ES256 passkeys are supported by this skeleton.');
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: toBase64Url(Buffer.from(x)),
    y: toBase64Url(Buffer.from(y)),
    ext: true,
  };
}

export function rpIdHashFor(rpId: string) {
  return createHash('sha256').update(rpId).digest();
}

function rawSignatureToDer(signature: Buffer) {
  if (signature.length !== 64) {
    return signature;
  }
  const r = signature.subarray(0, 32);
  const s = signature.subarray(32, 64);

  const encodeInteger = (part: Buffer) => {
    let normalized = Buffer.from(part);
    while (normalized.length > 1 && normalized[0] === 0x00) {
      normalized = normalized.subarray(1);
    }
    if (normalized[0] & 0x80) {
      normalized = Buffer.concat([Buffer.from([0x00]), normalized]);
    }
    return Buffer.concat([Buffer.from([0x02, normalized.length]), normalized]);
  };

  const rDer = encodeInteger(r);
  const sDer = encodeInteger(s);
  const length = rDer.length + sDer.length;
  return Buffer.concat([Buffer.from([0x30, length]), rDer, sDer]);
}

export function verifyPasskeyAssertion(params: {
  publicKeyJwk: JsonWebKey;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}) {
  const authDataBuffer = fromBase64Url(params.authenticatorData);
  const clientDataBuffer = fromBase64Url(params.clientDataJSON);
  const signatureBuffer = rawSignatureToDer(fromBase64Url(params.signature));
  const verificationBuffer = Buffer.concat([
    authDataBuffer,
    createHash('sha256').update(clientDataBuffer).digest(),
  ]);

  const publicKey = createPublicKey({ key: params.publicKeyJwk as any, format: 'jwk' });
  const verifier = createVerify('sha256');
  verifier.update(verificationBuffer);
  verifier.end();
  return verifier.verify(publicKey, signatureBuffer);
}

export function isPasskeyOriginMatch(expectedOrigin: string, clientOrigin: string) {
  return expectedOrigin.replace(/\/$/, '') === clientOrigin.replace(/\/$/, '');
}

export function isPasskeyChallengeMatch(expectedChallenge: string, clientChallenge: string) {
  return expectedChallenge === clientChallenge;
}

export function normalizeCredentialId(rawId: string) {
  return toBase64Url(fromBase64Url(rawId));
}
