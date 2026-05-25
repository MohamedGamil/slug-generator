import { randomBytes } from 'crypto';

const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface GenerateSlugOptions {
  length?: number;
  alphabet?: string;
  minLength?: number;
  maxLength?: number;
}

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

export interface ToSlugOptions {
  preserveCase?: boolean;
  preserveSpace?: boolean;
  minLength?: number;
  maxLength?: number;
  separator?: string;
}

export function toSlug(text: string, options: ToSlugOptions = {}): string {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string.');
  }

  const opts = options ?? {};
  const minLength = opts.minLength ?? 1;
  const maxLength = opts.maxLength ?? 128;
  const separator = typeof opts.separator === 'string' ? opts.separator : '-';

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

  // Normalize to decompose accents (e.g. é -> e)
  let sanitized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!opts.preserveCase) {
    sanitized = sanitized.toLowerCase();
  }

  if (!opts.preserveSpace) {
    // Remove all spaces around and inside the string
    sanitized = sanitized.replace(/\s+/g, '');
  }

  // Replace characters other than alphanumeric, whitespace, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s-_]/g, '');

  // Replace whitespace, hyphens, and underscores with the specified separator
  sanitized = sanitized.replace(/[\s-_]+/g, separator);

  // Trim leading/trailing separators (handles multi-character separators via groups)
  const escapedSeparator = separator ? separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const trimRegExp = escapedSeparator ? new RegExp(`^(?:${escapedSeparator})+|(?:${escapedSeparator})+$`, 'g') : null;

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

export const createSlug = generateSlug;
export const slugify = toSlug;


