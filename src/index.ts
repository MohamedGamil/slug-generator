import { randomBytes } from 'crypto';
import { Transliterator } from './transliterator.js';

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
}

/**
 * Generates a cryptographically secure random slug based on configurable length and alphabets.
 *
 * @param options - Configuration options for length, characters, and limits validation.
 * @returns A cryptographically secure random slug.
 * @throws An error if length limits are breached or inputs are invalid.
 */
export function generateSlug(options: GenerateSlugOptions = {}): string {
  const opts = options ?? {};
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

  let slug = '';
  const alphabetLength = alphabet.length;
  
  // Use cryptographically secure random bytes to avoid collisions
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    slug += alphabet[bytes[i] % alphabetLength];
  }

  return slug;
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

  if (typeof opts.allowedCharacters === 'string') {
    for (const char of opts.allowedCharacters) {
      if (!URL_SAFE_CHARACTERS.has(char)) {
        throw new Error(`Allowed character '${char}' is not URL safe.`);
      }
    }
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
  if (Transliterator.hasNonAscii(sanitized)) {
    sanitized = Transliterator.transliterate(sanitized);
  }

  // Normalize to decompose accents (e.g. é -> e)
  sanitized = sanitized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!opts.preserveCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Replace characters other than alphanumeric, whitespace, hyphens, underscores, and custom allowed characters
  let allowedPattern = 'a-zA-Z0-9\\s-_';
  if (typeof opts.allowedCharacters === 'string') {
    const escapedCustom = opts.allowedCharacters.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    allowedPattern += escapedCustom;
  }
  const sanitizationRegex = new RegExp(`[^${allowedPattern}]`, 'g');
  sanitized = sanitized.replace(sanitizationRegex, '');

  // Handle spacing and replacement
  if (opts.preserveSpace) {
    // Replace non-space whitespace, hyphens, and underscores with the specified separator
    sanitized = sanitized.replace(/[^\S ]+|[-_]+/g, separator);
    // Collapse consecutive spaces to a single space
    sanitized = sanitized.replace(/ +/g, ' ');
  } else {
    // Replace all whitespace, hyphens, and underscores with the specified separator
    sanitized = sanitized.replace(/[\s-_]+/g, separator);
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

  if (trimRegExp) {
    sanitized = sanitized.replace(trimRegExp, '');
  }

  // Truncate to maximum length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    if (trimRegExp) {
      sanitized = sanitized.replace(trimRegExp, '');
    }
  }

  if (sanitized.length < minLength) {
    throw new Error(`Sanitized slug length (${sanitized.length}) is less than minimum required length (${minLength}).`);
  }

  console.log(text, sanitized);

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
