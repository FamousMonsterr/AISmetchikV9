import type {
  PasskeyBrowserAssertionCredential,
  PasskeyBrowserAuthenticationOptions,
  PasskeyBrowserCreationCredential,
  PasskeyBrowserRegistrationOptions,
} from '@/types/passkey';

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

function normalizeBase64Padding(value: string) {
  const remainder = value.length % 4;
  if (remainder === 0) {
    return value;
  }
  return `${value}${'='.repeat(4 - remainder)}`;
}

function bytesFromBase64UrlBrowser(value: string): Uint8Array {
  if (!value) {
    return new Uint8Array();
  }

  const normalized = normalizeBase64Padding(value.replace(/-/g, '+').replace(/_/g, '/'));
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesFromValue(value: ArrayBuffer | ArrayBufferView | string) {
  if (typeof value === 'string') {
    return new TextEncoder().encode(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(value);
}

function toBase64UrlBrowser(value: ArrayBuffer | ArrayBufferView | string): string {
  const bytes = bytesFromValue(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function normalizeCreationOptions(
  payload: PasskeyBrowserRegistrationOptions,
): PublicKeyCredentialCreationOptions {
  const options = payload.publicKey;
  const excludeCredentials = (options.excludeCredentials || []).map(
    (credential): PublicKeyCredentialDescriptor => ({
      type: 'public-key',
      id: toArrayBuffer(bytesFromBase64UrlBrowser(credential.id)),
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    }),
  );

  return {
    ...options,
    challenge: toArrayBuffer(bytesFromBase64UrlBrowser(options.challenge)),
    user: {
      ...options.user,
      id: toArrayBuffer(bytesFromBase64UrlBrowser(options.user.id)),
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
      id: toArrayBuffer(bytesFromBase64UrlBrowser(credential.id)),
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    }),
  );

  return {
    ...options,
    challenge: toArrayBuffer(bytesFromBase64UrlBrowser(options.challenge)),
    allowCredentials,
  } as PublicKeyCredentialRequestOptions;
}

export function serializeCreationCredential(
  credential: PublicKeyCredential,
): PasskeyBrowserCreationCredential {
  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = toBase64UrlBrowser(credential.rawId);
  return {
    id: credentialId,
    rawId: credentialId,
    type: 'public-key',
    response: {
      clientDataJSON: toBase64UrlBrowser(response.clientDataJSON),
      attestationObject: toBase64UrlBrowser(response.attestationObject),
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
  const credentialId = toBase64UrlBrowser(credential.rawId);
  return {
    id: credentialId,
    rawId: credentialId,
    type: 'public-key',
    response: {
      clientDataJSON: toBase64UrlBrowser(response.clientDataJSON),
      authenticatorData: toBase64UrlBrowser(response.authenticatorData),
      signature: toBase64UrlBrowser(response.signature),
      userHandle: response.userHandle ? toBase64UrlBrowser(response.userHandle) : null,
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
    if (/base64|encoding|encoded/i.test(error.message)) {
      return 'Не удалось обработать ответ ключа доступа. Повторите попытку.';
    }
    return error.message;
  }
  return 'Не удалось выполнить операцию с ключом доступа.';
}
