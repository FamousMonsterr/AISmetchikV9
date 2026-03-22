import type {
  PasskeyBrowserAssertionCredential,
  PasskeyBrowserAuthenticationOptions,
  PasskeyBrowserCreationCredential,
  PasskeyBrowserRegistrationOptions,
} from '@/types/passkey';
import { bytesFromBase64Url, toBase64Url } from '@/lib/passkeys/encoding';

export type PasskeyCapabilities = {
  supported: boolean;
  platformAuthenticatorAvailable: boolean | null;
  conditionalMediationAvailable: boolean | null;
};

export function isPasskeySupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function detectPasskeyCapabilities(): Promise<PasskeyCapabilities> {
  if (!isPasskeySupported()) {
    return {
      supported: false,
      platformAuthenticatorAvailable: null,
      conditionalMediationAvailable: null,
    };
  }

  const credentialApi = window.PublicKeyCredential as typeof PublicKeyCredential & {
    isConditionalMediationAvailable?: () => Promise<boolean>;
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };

  const [platformAuthenticatorAvailable, conditionalMediationAvailable] = await Promise.all([
    typeof credentialApi.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ? credentialApi.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => null)
      : Promise.resolve(null),
    typeof credentialApi.isConditionalMediationAvailable === 'function'
      ? credentialApi.isConditionalMediationAvailable().catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    supported: true,
    platformAuthenticatorAvailable,
    conditionalMediationAvailable,
  };
}

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
}

export function normalizeCreationOptions(
  payload: PasskeyBrowserRegistrationOptions,
): PublicKeyCredentialCreationOptions {
  const options = payload.publicKey;
  const excludeCredentials = (options.excludeCredentials || []).map(
    (credential): PublicKeyCredentialDescriptor => ({
      type: 'public-key',
      id: toArrayBuffer(bytesFromBase64Url(credential.id)),
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    }),
  );

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

export function normalizeRequestOptions(
  payload: PasskeyBrowserAuthenticationOptions,
): PublicKeyCredentialRequestOptions {
  const options = payload.publicKey;
  const allowCredentials = (options.allowCredentials || []).map(
    (credential): PublicKeyCredentialDescriptor => ({
      type: 'public-key',
      id: toArrayBuffer(bytesFromBase64Url(credential.id)),
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    }),
  );

  return {
    ...options,
    challenge: toArrayBuffer(bytesFromBase64Url(options.challenge)),
    allowCredentials,
  } as PublicKeyCredentialRequestOptions;
}

export function serializeCreationCredential(
  credential: PublicKeyCredential,
): PasskeyBrowserCreationCredential {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: 'public-key',
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports:
        typeof response.getTransports === 'function' ? response.getTransports() : undefined,
    },
    clientExtensionResults: (credential.getClientExtensionResults?.() ||
      {}) as unknown as Record<string, unknown>,
  };
}

export function serializeAssertionCredential(
  credential: PublicKeyCredential,
): PasskeyBrowserAssertionCredential {
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
    clientExtensionResults: (credential.getClientExtensionResults?.() ||
      {}) as unknown as Record<string, unknown>,
  };
}

export function parsePasskeyError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'NotAllowedError'
      ? 'Действие отменено или устройство не подтвердило ключ доступа.'
      : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить операцию с ключом доступа.';
}
