export function toBase64Url(value: Buffer | Uint8Array | ArrayBuffer | string): string {
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value).toString('base64url');
  }
  return Buffer.from(value).toString('base64url');
}

export function fromBase64Url(value: string): Buffer {
  if (!value) {
    return Buffer.alloc(0);
  }
  return Buffer.from(value, 'base64url');
}

export function bytesFromBase64Url(value: string): Uint8Array {
  return new Uint8Array(fromBase64Url(value));
}

export function ensureBase64Url(value: string | Buffer | Uint8Array): string {
  if (typeof value === 'string') {
    return value;
  }
  return toBase64Url(value);
}
