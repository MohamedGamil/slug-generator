import { DEFAULT_ALPHABET, URL_SAFE_CHARACTERS } from '../utils.js';
import { GenerateSlugOptions } from '../types.js';

let randomBytesFn: (size: number) => Uint8Array;
let warned = false;

if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
  randomBytesFn = (size: number) => {
    const array = new Uint8Array(size);
    globalThis.crypto.getRandomValues(array);
    return array;
  };
} else {
  try {
    // Dynamic import to avoid browser static resolution failure
    const cryptoModule = await import('crypto');
    randomBytesFn = (size: number) => new Uint8Array(cryptoModule.randomBytes(size));
  } catch {
    randomBytesFn = (size: number) => {
      if (!warned) {
        console.warn(
          '[slug-generator] Cryptographically secure random number generator not found in this environment. ' +
          'Falling back to non-secure Math.random.'
        );
        warned = true;
      }
      const array = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

export function getRandomBytes(size: number): Uint8Array {
  return randomBytesFn(size);
}

let entropyCounter = 0;

/**
 * Mixes additional high-resolution timing and environment entropy into the given byte array.
 */
export function mixEntropy(bytes: Uint8Array): void {
  const time = Date.now();
  const perf = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : 0;
  const hr = typeof process !== 'undefined' && typeof process.hrtime === 'function' ? process.hrtime()[1] : 0;
  const pid = typeof process !== 'undefined' ? process.pid : 0;
  entropyCounter++;

  let seed = time ^ Math.floor(perf * 1000) ^ hr ^ pid ^ entropyCounter;

  for (let i = 0; i < bytes.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    bytes[i] ^= (seed & 0xFF);
  }
}

/**
 * Service class for generating cryptographically secure random slugs.
 * Uses rejection sampling to eliminate modulo bias and supports high-performance batch operations.
 */
export class RandomSlugGenerator {
  /**
   * Generates a single cryptographically secure random slug based on configuration options.
   *
   * @param options - Configuration options (e.g. length, alphabet, prefix, suffix, separator) or target length number.
   * @returns A cryptographically secure random slug.
   * @throws Error if configuration options are invalid or length constraints are violated.
   */
  public static generate(options: GenerateSlugOptions | number = {}): string {
    const opts = typeof options === 'number' ? { length: options } : (options ?? {});
    const length = opts.length ?? 8;
    const alphabet = opts.alphabet ?? DEFAULT_ALPHABET;
    const minLength = opts.minLength ?? 5;
    const maxLength = opts.maxLength ?? 64;

    if (typeof alphabet !== 'string' || alphabet.length === 0) {
      throw new Error('Alphabet option must be a non-empty string.');
    }

    if (!Number.isInteger(length)) {
      throw new Error('Length must be an integer.');
    }
    if (!Number.isInteger(minLength)) {
      throw new Error('Minimum slug length configuration must be an integer.');
    }
    if (!Number.isInteger(maxLength)) {
      throw new Error('Maximum slug length configuration must be an integer.');
    }

    if (minLength < 2) {
      throw new Error('Minimum slug length configuration cannot be less than 2.');
    }
    if (maxLength > 64) {
      throw new Error('Maximum slug length configuration cannot exceed 64.');
    }
    if (minLength > maxLength) {
      throw new Error('Minimum slug length cannot be greater than maximum slug length.');
    }

    if (length < minLength || length > maxLength) {
      throw new Error(`Slug length must be between ${minLength} and ${maxLength} characters.`);
    }

    if (opts.prefix !== undefined) {
      if (typeof opts.prefix !== 'string') {
        throw new Error('Prefix option must be a string.');
      }
      for (const char of opts.prefix) {
        if (!URL_SAFE_CHARACTERS.has(char)) {
          throw new Error(`Prefix character '${char}' is not URL safe.`);
        }
      }
    }

    if (opts.suffix !== undefined) {
      if (typeof opts.suffix !== 'string') {
        throw new Error('Suffix option must be a string.');
      }
      for (const char of opts.suffix) {
        if (!URL_SAFE_CHARACTERS.has(char)) {
          throw new Error(`Suffix character '${char}' is not URL safe.`);
        }
      }
    }

    if (opts.separator !== undefined) {
      if (typeof opts.separator !== 'string') {
        throw new Error('Separator option must be a string.');
      }
      if (opts.separator.length !== 1) {
        throw new Error('Separator must be exactly 1 character long.');
      }
      if (!URL_SAFE_CHARACTERS.has(opts.separator)) {
        throw new Error(`Separator character '${opts.separator}' is not URL safe.`);
      }
    }

    let randomPart = '';
    const alphabetLength = alphabet.length;
    const limit = 256 - (256 % alphabetLength);

    while (randomPart.length < length) {
      const bytesNeeded = Math.max(length - randomPart.length, 10);
      const bytes = randomBytesFn(bytesNeeded);
      mixEntropy(bytes);
      for (let i = 0; i < bytes.length && randomPart.length < length; i++) {
        if (bytes[i] < limit) {
          randomPart += alphabet[bytes[i] % alphabetLength];
        }
      }
    }

    const parts: string[] = [];
    if (opts.prefix) {
      parts.push(opts.prefix);
    }
    parts.push(randomPart);
    if (opts.suffix) {
      parts.push(opts.suffix);
    }

    return parts.join(opts.separator ?? '');
  }

  /**
   * Generates a batch of cryptographically secure random slugs at high performance.
   * Internally pre-allocates a single unified random byte buffer to minimize system call overhead.
   *
   * @param count - The number of slugs to generate. Must be a positive integer.
   * @param options - Configuration options or target length number.
   * @returns An array of generated random slugs.
   * @throws Error if count is invalid or options configuration fails validation constraints.
   */
  public static generateBatch(count: number, options: GenerateSlugOptions | number = {}): string[] {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('Count must be a positive integer.');
    }
    const opts = typeof options === 'number' ? { length: options } : (options ?? {});
    const length = opts.length ?? 8;
    const alphabet = opts.alphabet ?? DEFAULT_ALPHABET;
    const minLength = opts.minLength ?? 5;
    const maxLength = opts.maxLength ?? 64;

    if (typeof alphabet !== 'string' || alphabet.length === 0) {
      throw new Error('Alphabet option must be a non-empty string.');
    }

    if (!Number.isInteger(length)) {
      throw new Error('Length must be an integer.');
    }
    if (!Number.isInteger(minLength)) {
      throw new Error('Minimum slug length configuration must be an integer.');
    }
    if (!Number.isInteger(maxLength)) {
      throw new Error('Maximum slug length configuration must be an integer.');
    }

    if (minLength < 2) {
      throw new Error('Minimum slug length configuration cannot be less than 2.');
    }
    if (maxLength > 64) {
      throw new Error('Maximum slug length configuration cannot exceed 64.');
    }
    if (minLength > maxLength) {
      throw new Error('Minimum slug length cannot be greater than maximum slug length.');
    }

    if (length < minLength || length > maxLength) {
      throw new Error(`Slug length must be between ${minLength} and ${maxLength} characters.`);
    }

    if (opts.prefix !== undefined) {
      if (typeof opts.prefix !== 'string') {
        throw new Error('Prefix option must be a string.');
      }
      for (const char of opts.prefix) {
        if (!URL_SAFE_CHARACTERS.has(char)) {
          throw new Error(`Prefix character '${char}' is not URL safe.`);
        }
      }
    }

    if (opts.suffix !== undefined) {
      if (typeof opts.suffix !== 'string') {
        throw new Error('Suffix option must be a string.');
      }
      for (const char of opts.suffix) {
        if (!URL_SAFE_CHARACTERS.has(char)) {
          throw new Error(`Suffix character '${char}' is not URL safe.`);
        }
      }
    }

    if (opts.separator !== undefined) {
      if (typeof opts.separator !== 'string') {
        throw new Error('Separator option must be a string.');
      }
      if (opts.separator.length !== 1) {
        throw new Error('Separator must be exactly 1 character long.');
      }
      if (!URL_SAFE_CHARACTERS.has(opts.separator)) {
        throw new Error(`Separator character '${opts.separator}' is not URL safe.`);
      }
    }

    const alphabetLength = alphabet.length;
    const limit = 256 - (256 % alphabetLength);
    const rejectionRate = 256 / limit;
    const estimatedBytesPerSlug = Math.ceil(length * rejectionRate * 1.15);

    let currentBytes = randomBytesFn(count * estimatedBytesPerSlug);
    mixEntropy(currentBytes);
    let byteIndex = 0;

    const slugs: string[] = [];
    for (let s = 0; s < count; s++) {
      let randomPart = '';
      while (randomPart.length < length) {
        if (byteIndex >= currentBytes.length) {
          const needed = (count - s) * estimatedBytesPerSlug;
          currentBytes = randomBytesFn(Math.max(needed, 10));
          mixEntropy(currentBytes);
          byteIndex = 0;
        }
        const byte = currentBytes[byteIndex++];
        if (byte < limit) {
          randomPart += alphabet[byte % alphabetLength];
        }
      }

      const parts: string[] = [];
      if (opts.prefix) {
        parts.push(opts.prefix);
      }
      parts.push(randomPart);
      if (opts.suffix) {
        parts.push(opts.suffix);
      }
      slugs.push(parts.join(opts.separator ?? ''));
    }

    return slugs;
  }
}
