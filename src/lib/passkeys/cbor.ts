type DecodeResult = { value: any; read: number };

function readLength(buffer: Buffer, offset: number, additionalInfo: number): { length: number; read: number } {
  if (additionalInfo < 24) {
    return { length: additionalInfo, read: 0 };
  }
  if (additionalInfo === 24) {
    return { length: buffer.readUInt8(offset), read: 1 };
  }
  if (additionalInfo === 25) {
    return { length: buffer.readUInt16BE(offset), read: 2 };
  }
  if (additionalInfo === 26) {
    return { length: buffer.readUInt32BE(offset), read: 4 };
  }
  if (additionalInfo === 27) {
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    if (high > 0x1fffffff) {
      throw new Error('CBOR integer is too large to decode safely.');
    }
    return { length: high * 0x100000000 + low, read: 8 };
  }
  if (additionalInfo === 31) {
    return { length: -1, read: 0 };
  }
  throw new Error(`Unsupported CBOR length marker: ${additionalInfo}`);
}

function decodeHalfFloat(raw: number) {
  const sign = (raw & 0x8000) ? -1 : 1;
  const exp = (raw & 0x7c00) >> 10;
  const frac = raw & 0x03ff;
  if (exp === 0) return sign * Math.pow(2, -14) * (frac / Math.pow(2, 10));
  if (exp === 0x1f) return frac ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 15) * (1 + frac / Math.pow(2, 10));
}

function decodeItem(buffer: Buffer, offset: number): DecodeResult {
  if (offset >= buffer.length) {
    throw new Error('Unexpected end of CBOR buffer.');
  }

  const head = buffer.readUInt8(offset);
  const majorType = head >> 5;
  const additionalInfo = head & 0x1f;
  let cursor = offset + 1;

  const readValue = () => {
    const { length, read } = readLength(buffer, cursor, additionalInfo);
    cursor += read;
    return { length, cursor };
  };

  switch (majorType) {
    case 0: {
      const { length, cursor: next } = readValue();
      return { value: length, read: next - offset };
    }
    case 1: {
      const { length, cursor: next } = readValue();
      return { value: -1 - length, read: next - offset };
    }
    case 2: {
      if (additionalInfo === 31) {
        const chunks: Buffer[] = [];
        while (buffer.readUInt8(cursor) !== 0xff) {
          const chunk = decodeItem(buffer, cursor);
          if (!Buffer.isBuffer(chunk.value)) {
            throw new Error('Invalid indefinite byte string chunk.');
          }
          chunks.push(chunk.value);
          cursor += chunk.read;
        }
        cursor += 1;
        return { value: Buffer.concat(chunks), read: cursor - offset };
      }
      const { length, cursor: next } = readValue();
      const end = next + length;
      return { value: buffer.subarray(next, end), read: end - offset };
    }
    case 3: {
      if (additionalInfo === 31) {
        const parts: string[] = [];
        while (buffer.readUInt8(cursor) !== 0xff) {
          const chunk = decodeItem(buffer, cursor);
          if (typeof chunk.value !== 'string') {
            throw new Error('Invalid indefinite text string chunk.');
          }
          parts.push(chunk.value);
          cursor += chunk.read;
        }
        cursor += 1;
        return { value: parts.join(''), read: cursor - offset };
      }
      const { length, cursor: next } = readValue();
      const end = next + length;
      return { value: buffer.subarray(next, end).toString('utf8'), read: end - offset };
    }
    case 4: {
      const items: any[] = [];
      if (additionalInfo === 31) {
        while (buffer.readUInt8(cursor) !== 0xff) {
          const item = decodeItem(buffer, cursor);
          items.push(item.value);
          cursor += item.read;
        }
        cursor += 1;
        return { value: items, read: cursor - offset };
      }
      const { length, cursor: next } = readValue();
      cursor = next;
      for (let i = 0; i < length; i += 1) {
        const item = decodeItem(buffer, cursor);
        items.push(item.value);
        cursor += item.read;
      }
      return { value: items, read: cursor - offset };
    }
    case 5: {
      const obj: Record<string, any> = {};
      if (additionalInfo === 31) {
        while (buffer.readUInt8(cursor) !== 0xff) {
          const key = decodeItem(buffer, cursor);
          cursor += key.read;
          const value = decodeItem(buffer, cursor);
          cursor += value.read;
          obj[String(key.value)] = value.value;
        }
        cursor += 1;
        return { value: obj, read: cursor - offset };
      }
      const { length, cursor: next } = readValue();
      cursor = next;
      for (let i = 0; i < length; i += 1) {
        const key = decodeItem(buffer, cursor);
        cursor += key.read;
        const value = decodeItem(buffer, cursor);
        cursor += value.read;
        obj[String(key.value)] = value.value;
      }
      return { value: obj, read: cursor - offset };
    }
    case 6: {
      const { length, cursor: next } = readValue();
      const item = decodeItem(buffer, next);
      return { value: item.value, read: item.read + (next - offset) };
    }
    case 7: {
      if (additionalInfo === 20) return { value: false, read: 1 };
      if (additionalInfo === 21) return { value: true, read: 1 };
      if (additionalInfo === 22) return { value: null, read: 1 };
      if (additionalInfo === 23) return { value: undefined, read: 1 };
      if (additionalInfo === 24) return { value: buffer.readUInt8(cursor), read: 2 };
      if (additionalInfo === 25) return { value: decodeHalfFloat(buffer.readUInt16BE(cursor)), read: 3 };
      if (additionalInfo === 26) return { value: buffer.readFloatBE(cursor), read: 5 };
      if (additionalInfo === 27) return { value: buffer.readDoubleBE(cursor), read: 9 };
      if (additionalInfo === 31) return { value: null, read: 1 };
      if (additionalInfo < 20) return { value: additionalInfo, read: 1 };
      throw new Error(`Unsupported CBOR simple value: ${additionalInfo}`);
    }
    default:
      throw new Error(`Unsupported CBOR major type: ${majorType}`);
  }
}

export function decodeCbor(buffer: Buffer, offset = 0): DecodeResult {
  return decodeItem(buffer, offset);
}
