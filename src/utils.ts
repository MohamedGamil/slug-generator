export const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const URL_SAFE_CHARACTERS = new Set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~');

const DECODE_MAP = new Uint8Array(256);
for (let i = 0; i < 64; i++) {
  DECODE_MAP[DEFAULT_ALPHABET.charCodeAt(i)] = i;
}

/**
 * Encodes a Uint8Array of bytes into a URL-safe Base64 string without padding.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;
  
  while (i < len) {
    const b1 = bytes[i++];
    const b2 = i < len ? bytes[i++] : NaN;
    const b3 = i < len ? bytes[i++] : NaN;
    
    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? NaN : (((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6));
    const enc4 = isNaN(b3) ? NaN : (b3 & 63);
    
    result += DEFAULT_ALPHABET[enc1] + DEFAULT_ALPHABET[enc2];
    if (!isNaN(enc3)) result += DEFAULT_ALPHABET[enc3];
    if (!isNaN(enc4)) result += DEFAULT_ALPHABET[enc4];
  }
  return result;
}

/**
 * Decodes a URL-safe Base64 string without padding back into a Uint8Array.
 */
export function base64UrlToBytes(str: string): Uint8Array {
  const len = str.length;
  const bufferLen = Math.floor((len * 6) / 8);
  const bytes = new Uint8Array(bufferLen);
  
  let byteIdx = 0;
  let i = 0;
  while (i < len) {
    const enc1 = DECODE_MAP[str.charCodeAt(i++)];
    const enc2 = i < len ? DECODE_MAP[str.charCodeAt(i++)] : 0;
    const enc3 = i < len ? DECODE_MAP[str.charCodeAt(i++)] : 64;
    const enc4 = i < len ? DECODE_MAP[str.charCodeAt(i++)] : 64;
    
    const b1 = (enc1 << 2) | (enc2 >> 4);
    const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const b3 = ((enc3 & 3) << 6) | enc4;
    
    if (byteIdx < bufferLen) bytes[byteIdx++] = b1;
    if (enc3 !== 64 && byteIdx < bufferLen) bytes[byteIdx++] = b2;
    if (enc4 !== 64 && byteIdx < bufferLen) bytes[byteIdx++] = b3;
  }
  return bytes;
}
