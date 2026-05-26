import { getRandomBytes } from '../core/random.js';
import { bytesToBase64Url } from '../utils.js';

let lastUuidTime = -1n;
let clockSeq = 0n;

// Initialize clock sequence randomly once per lifecycle (14 bits)
try {
  const initBytes = getRandomBytes(2);
  clockSeq = BigInt(((initBytes[0] << 8) | initBytes[1]) & 0x3FFF);
} catch {
  clockSeq = BigInt(Math.floor(Math.random() * 16384));
}

// Initialize node ID randomly once per lifecycle (48 bits)
let nodeHex = '';
try {
  const nodeBytes = getRandomBytes(6);
  nodeBytes[0] |= 0x01; // Set multicast bit
  nodeHex = Array.from(nodeBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
} catch {
  const randomNode = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    randomNode[i] = Math.floor(Math.random() * 256);
  }
  randomNode[0] |= 0x01;
  nodeHex = Array.from(randomNode)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}



/**
 * Utility class for generating UUIDs (v4 and v6) and compressing standard UUID strings into URL-safe slugs.
 */
export class UuidSlugGenerator {
  /**
   * Generates a standard random UUIDv4 string.
   *
   * @returns A standard 36-character UUIDv4 string.
   */
  public static v4(): string {
    const bytes = getRandomBytes(16);
    // Set version to 4
    bytes[6] = (bytes[6] & 0x0F) | 0x40;
    // Set variant to RFC 4122 (10xx)
    bytes[8] = (bytes[8] & 0x3F) | 0x80;
    
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  /**
   * Generates a time-ordered UUIDv6 string.
   * Optimized for database B-Tree indexing and sequential lexicographical sortability.
   *
   * @returns A standard 36-character UUIDv6 string.
   */
  public static v6(): string {
    const now = BigInt(Date.now()) * 10000n + 122192928000000000n; // 100ns intervals since Gregorian epoch
    
    if (now <= lastUuidTime) {
      clockSeq = (clockSeq + 1n) & 0x3FFFn;
    }
    lastUuidTime = now;

    const timeHex = now.toString(16).padStart(15, '0');
    // UUIDv6 layout:
    // time_high (32 bits) - time_mid (16 bits) - time_low_and_version (16 bits, prefixed by 6)
    const timeHigh = timeHex.slice(0, 8);
    const timeMid = timeHex.slice(8, 12);
    const timeLowAndVersion = '6' + timeHex.slice(12, 15);

    const clockSeqAndVariant = ((clockSeq & 0x3FFFn) | 0x8000n).toString(16).padStart(4, '0');

    return `${timeHigh}-${timeMid}-${timeLowAndVersion}-${clockSeqAndVariant}-${nodeHex}`;
  }

  /**
   * Compacts a 36-character standard UUID string into a 22-character URL-safe Base64 slug.
   *
   * @param uuid - The standard 36-character UUID string (with or without hyphens).
   * @returns A URL-safe 22-character Base64 string representing the UUID.
   * @throws Error if input is not a string or has an invalid UUID format.
   */
  public static slugify(uuid: string): string {
    if (typeof uuid !== 'string') {
      throw new Error('UUID input must be a string.');
    }
    const clean = uuid.replace(/-/g, '');
    if (clean.length !== 32 || !/^[0-9a-fA-F]+$/.test(clean)) {
      throw new Error('Invalid UUID format.');
    }

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }

    return bytesToBase64Url(bytes);
  }
}
