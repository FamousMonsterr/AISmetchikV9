import type {
  PasskeyBrowserAssertionCredential,
  PasskeyBrowserAuthenticationOptions,
  PasskeyBrowserCreationCredential,
  PasskeyBrowserRegistrationOptions,
} from '@/types/passkey';
import { bytesFromBase64Url, toBase64Url } from '@/lib/passkeys/encoding';

export function isPasskeySupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
}

export function normalizeCreationOptions(payload: PasskeyBrowserRegistrationOptions): PublicKeyCredentialCreationOptions {
  const options = payload.publicKey;
  const excludeCredentials = (options.excludeCredentials || []).map((credential): PublicKeyCredentialDescriptor => ({
    type: 'public-key',
    id: toArrayBuffer(bytesFromBase64Url(credential.id)),
    transports: credential.transports as AuthenticatorTransport[] | undefined,
  }));
  return {
    ...options,
    challenge: toArrayBuffer(bytesFromBase64Url(options.challenge)),
    user: {
      ...options.user,
      id: toArrayBuffer(bytesFromBase64Url(options.user.id)),
    },
    excludeCredentials,
  } as PublicKeyCredentialCreationOptions;
}

export function normalizeRequestOptions(payload: PasskeyBrowserAuthenticationOptions): PublicKeyCredentialRequestOptions {
  const options = payload.publicKey;
  const allowCredentials = (options.allowCredentials || []).map((credential): PublicKeyCredentialDescriptor => ({
    type: 'public-key',
    id: toArrayBuffer(bytesFromBase64Url(credential.id)),
    transports: credential.transports as AuthenticatorTransport[] | undefined,
  }));
  return {
    ...options,
    challenge: toArrayBuffer(bytesFromBase64Url(options.challenge)),
    allowCredentials,
  } as PublicKeyCredentialRequestOptions;
}

export function serializeCreationCredential(credential: PublicKeyCredential): PasskeyBrowserCreationCredential {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: 'public-key',
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : undefined,
    },
    clientExtensionResults: (credential.getClientExtensionResults?.() || {}) as unknown as Record<string, unknown>,
  };
}

export function serializeAssertionCredential(credential: PublicKeyCredential): PasskeyBrowserAssertionCredential {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: 'public-key',
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      authenticatorData: toBase64Url(response.authenticatorData),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: (credential.getClientExtensionResults?.() || {}) as unknown as Record<string, unknown>,
  };
}

export function parsePasskeyError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'NotAllowedError'
      ? 'Пользователь отменил действие или устройство не подтвердило passkey.'
      : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить passkey-операцию.';
}
