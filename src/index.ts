import { Transliterator } from './transliterator.js';

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

let entropyCounter = 0;

/**
 * Mixes additional high-resolution timing and environment entropy into the given byte array.
 * This ensures that randomness integrity is enhanced (especially in Math.random fallback modes)
 * and collisions are minimized. Mathematically, XORing cryptographically secure random bytes
 * with secondary independent entropy preserves 100% of the cryptographic randomness integrity.
 */
function mixEntropy(bytes: Uint8Array): void {
  const time = Date.now();
  const perf = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : 0;
  const hr = typeof process !== 'undefined' && typeof process.hrtime === 'function' ? process.hrtime()[1] : 0;
  const pid = typeof process !== 'undefined' ? process.pid : 0;
  entropyCounter++;

  // Seed combination using XOR of all available entropy sources
  let seed = time ^ Math.floor(perf * 1000) ^ hr ^ pid ^ entropyCounter;

  // Simple, fast xorshift32 PRNG to generate mixing bytes sequence
  for (let i = 0; i < bytes.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    
    // Mix into the byte array via XOR
    bytes[i] ^= (seed & 0xFF);
  }
}

const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const URL_SAFE_CHARACTERS = new Set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~');

/**
 * Options configuration for generating random secure slugs.
 */
export interface GenerateSlugOptions {
  /**
   * The target length of the generated slug. Defaults to `8`.
   */
  length?: number;
  /**
   * The set of allowed characters for the slug. Defaults to `A-Z`, `a-z`, `0-9`, `-`, and `_`.
   */
  alphabet?: string;
  /**
   * The minimum allowable generated slug length configuration boundary. Defaults to `5`. Must be >= 2.
   */
  minLength?: number;
  /**
   * The maximum allowable generated slug length configuration boundary. Defaults to `64`. Must be <= 64.
   */
  maxLength?: number;
  /**
   * Optional fixed prefix to prepend to the slug.
   */
  prefix?: string;
  /**
   * Optional fixed suffix to append to the slug.
   */
  suffix?: string;
  /**
   * Separator character between prefix/suffix and the random part. Defaults to no separator if not provided. Must be exactly 1 character and belong to `a-zA-Z0-9-_.~`.
   */
  separator?: string;
}

/**
 * Generates a cryptographically secure random slug based on configurable length and alphabets.
 *
 * @param options - Configuration options for length, characters, and limits validation.
 * @returns A cryptographically secure random slug.
 * @throws An error if length limits are breached or inputs are invalid.
 */
export function generateSlug(options: GenerateSlugOptions | number = {}): string {
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
  
  // Use cryptographically secure random bytes with rejection sampling to avoid modulo bias
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
 * Options configuration for generating unique secure slugs.
 */
export interface GenerateUniqueSlugOptions extends GenerateSlugOptions {
  /**
   * Validation function to check if the generated slug already exists.
   * Must return `true` if the slug exists (is taken) and `false` if it is unique.
   */
  exists: (slug: string) => boolean | Promise<boolean>;
  /**
   * Maximum number of attempts to generate a unique slug before throwing an error. Defaults to `100`.
   */
  maxRetries?: number;
}

/**
 * Generates a unique cryptographically secure random slug.
 *
 * @param options - Configuration options extending GenerateSlugOptions, including the exists check.
 * @returns A promise resolving to a unique cryptographically secure random slug.
 * @throws An error if a unique slug cannot be generated within maxRetries attempts or if exists is missing.
 */
export async function generateUniqueSlug(options: GenerateUniqueSlugOptions): Promise<string> {
  if (!options) {
    throw new Error('Options object is required.');
  }
  if (typeof options.exists !== 'function') {
    throw new Error('exists option is required and must be a function.');
  }

  const maxRetries = options.maxRetries ?? 100;
  if (!Number.isInteger(maxRetries) || maxRetries <= 0) {
    throw new Error('maxRetries must be a positive integer.');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const slug = generateSlug(options);
    const taken = await options.exists(slug);
    if (!taken) {
      return slug;
    }
  }

  throw new Error(`Failed to generate a unique slug after ${maxRetries} attempts.`);
}

/**
 * Options configuration for text-based slugification.
 */
export interface ToSlugOptions {
  /**
   * If true, preserves the original casing. If false (default), lowercases all characters.
   */
  preserveCase?: boolean;
  /**
   * If true, preserves space characters as literal spaces `" "`. If false (default), replaces them with the separator.
   */
  preserveSpace?: boolean;
  /**
   * The minimum allowable length configuration for the sanitized slug. Defaults to `1`. Must be >= 1.
   */
  minLength?: number;
  /**
   * The maximum allowable length configuration for the sanitized slug. Defaults to `128`. Must be <= 128.
   */
  maxLength?: number;
  /**
   * A single URL-safe character used to replace spacing/hyphens/underscores. Defaults to `'-'`. Must be exactly 1 character and belong to `a-zA-Z0-9-_.~`.
   */
  separator?: string;
  /**
   * A string containing custom allowed characters to preserve in the sanitized slug. Must only contain URL-safe characters (`a-zA-Z0-9-_.~`).
   */
  allowedCharacters?: string;
  /**
   * If true, converts the output to lowercase. Defaults to true if not specified.
   */
  lowercase?: boolean;
  /**
   * If true, converts the output to uppercase. Defaults to false.
   */
  uppercase?: boolean;
  /**
   * If true, preserves Unicode letters and numbers instead of converting to ASCII. Defaults to false.
   */
  preserveUnicode?: boolean;
  /**
   * If true, converts non-Latin scripts to ASCII phonetic equivalents. Defaults to true.
   */
  transliterate?: boolean;
  /**
   * Custom characters (either string or RegExp) allowed to remain in the sanitized slug.
   */
  allowedChars?: RegExp | string;
  /**
   * A fallback string value to return if the sanitized slug is empty or too short. Set this option value to `%AUTO%` to generate a random 8 characters long slug.
   */
  fallback?: string;
  /**
   * If true, trims leading and trailing separators. Defaults to true.
   */
  trim?: boolean;
  /**
   * If true, collapses multiple consecutive separators. Defaults to true.
   */
  collapseSeparators?: boolean;
}

/**
 * Sanitizes arbitrary UTF-8 text into a URL-friendly slug based on options.
 *
 * @param text - The arbitrary input text to convert.
 * @param options - Configuration options for separator, casing, spacing, and characters.
 * @returns The sanitized URL-safe slug.
 * @throws An error if input validation checks or configuration constraints are breached.
 */
export function toSlug(text: string, options: ToSlugOptions = {}): string {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string.');
  }

  const opts = options ?? {};
  const minLength = opts.minLength ?? 1;
  const maxLength = opts.maxLength ?? 128;
  const separator = typeof opts.separator === 'string' ? opts.separator : '-';

  if (opts.separator !== undefined && typeof opts.separator !== 'string') {
    throw new Error('Separator option must be a string.');
  }

  if (typeof opts.separator === 'string') {
    if (opts.separator.length !== 1) {
      throw new Error('Separator must be exactly 1 character long.');
    }
    if (!URL_SAFE_CHARACTERS.has(opts.separator)) {
      throw new Error(`Separator character '${opts.separator}' is not URL safe.`);
    }
  }

  if (opts.allowedCharacters !== undefined && typeof opts.allowedCharacters !== 'string') {
    throw new Error('Allowed characters option must be a string.');
  }

  if (opts.allowedChars !== undefined && typeof opts.allowedChars !== 'string' && !(opts.allowedChars instanceof RegExp)) {
    throw new Error('Allowed characters option must be a string or RegExp.');
  }

  const allowedCharsOption = opts.allowedChars !== undefined ? opts.allowedChars : opts.allowedCharacters;
  if (typeof allowedCharsOption === 'string') {
    for (const char of allowedCharsOption) {
      if (!URL_SAFE_CHARACTERS.has(char)) {
        throw new Error(`Allowed character '${char}' is not URL safe.`);
      }
    }
  }

  if (opts.lowercase === true && opts.uppercase === true) {
    throw new Error('Cannot set both lowercase and uppercase to true.');
  }

  if (!Number.isInteger(minLength)) {
    throw new Error('Minimum slug length configuration must be an integer.');
  }
  if (!Number.isInteger(maxLength)) {
    throw new Error('Maximum slug length configuration must be an integer.');
  }

  if (minLength < 1) {
    throw new Error('Minimum slug length configuration cannot be less than 1.');
  }
  if (maxLength > 128) {
    throw new Error('Maximum slug length configuration cannot exceed 128.');
  }
  if (minLength > maxLength) {
    throw new Error('Minimum slug length cannot be greater than maximum slug length.');
  }

  let sanitized = text;

  // Transliterate non-Latin scripts to their phonetic ASCII equivalents before normalization
  const shouldTransliterate = opts.transliterate !== false && !opts.preserveUnicode;
  if (shouldTransliterate && Transliterator.hasNonAscii(sanitized)) {
    sanitized = Transliterator.transliterate(sanitized);
  }

  // Normalize to decompose accents (e.g. é -> e) unless preserving Unicode
  if (opts.preserveUnicode) {
    sanitized = sanitized.normalize('NFC');
  } else {
    sanitized = sanitized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Apply Casing options
  let targetCase: 'lower' | 'upper' | 'preserve' = 'lower';
  if (opts.preserveCase || opts.lowercase === false) {
    targetCase = 'preserve';
  } else if (opts.uppercase === true) {
    targetCase = 'upper';
  }

  if (targetCase === 'lower') {
    sanitized = sanitized.toLowerCase();
  } else if (targetCase === 'upper') {
    sanitized = sanitized.toUpperCase();
  }

  // Filter allowed characters
  if (allowedCharsOption instanceof RegExp) {
    const testRegex = new RegExp(allowedCharsOption.source, allowedCharsOption.flags.replace('g', ''));
    const defaultPattern = opts.preserveUnicode ? /[\p{L}\p{N}\s\-_]/u : /[a-zA-Z0-9\s\-_]/;
    sanitized = Array.from(sanitized)
      .filter(char => defaultPattern.test(char) || testRegex.test(char))
      .join('');
  } else {
    let allowedPattern: string;
    const escapedCustom = typeof allowedCharsOption === 'string'
      ? allowedCharsOption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';

    if (opts.preserveUnicode) {
      allowedPattern = `\\p{L}\\p{N}\\s\\-_${escapedCustom}`;
      const sanitizationRegex = new RegExp(`[^${allowedPattern}]`, 'gu');
      sanitized = sanitized.replace(sanitizationRegex, '');
    } else {
      allowedPattern = `a-zA-Z0-9\\s\\-_${escapedCustom}`;
      const sanitizationRegex = new RegExp(`[^${allowedPattern}]`, 'g');
      sanitized = sanitized.replace(sanitizationRegex, '');
    }
  }

  // Handle spacing and replacement
  if (opts.preserveSpace) {
    if (opts.collapseSeparators !== false) {
      sanitized = sanitized.replace(/[^\S ]+|[-_]+/g, separator);
      sanitized = sanitized.replace(/ +/g, ' ');
    } else {
      sanitized = sanitized.replace(/[^\S ]/g, separator).replace(/[-_]/g, separator);
    }
  } else {
    if (opts.collapseSeparators !== false) {
      sanitized = sanitized.replace(/[\s\-_]+/g, separator);
    } else {
      sanitized = sanitized.replace(/[\s\-_]/g, separator);
    }
  }

  // Trim leading/trailing separators and spaces (if preserveSpace is true)
  const escapedSeparator = separator ? separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const trimParts: string[] = [];
  if (escapedSeparator) {
    trimParts.push(`(?:${escapedSeparator})`);
  }
  if (opts.preserveSpace) {
    trimParts.push('\\s');
  }
  const trimRegExp = trimParts.length > 0 
    ? new RegExp(`^(?:${trimParts.join('|')})+|(?:${trimParts.join('|')})+$`, 'g')
    : null;

  if (trimRegExp && opts.trim !== false) {
    sanitized = sanitized.replace(trimRegExp, '');
  }

  // Truncate to maximum length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    if (trimRegExp && opts.trim !== false) {
      sanitized = sanitized.replace(trimRegExp, '');
    }
  }

  if (sanitized.length < minLength) {
    if (opts.fallback !== undefined) {
      return String(opts.fallback ?? '').trim().toUpperCase() === '%AUTO%'
        ? generateSlug()
        : opts.fallback;
    }
    throw new Error(`Sanitized slug length (${sanitized.length}) is less than minimum required length (${minLength}).`);
  }

  return sanitized;
}

/**
 * Alias function for generateSlug.
 */
export const createSlug = generateSlug;

/**
 * Alias function for toSlug.
 */
export const slugify = toSlug;
