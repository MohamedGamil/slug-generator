import { randomBytes } from 'crypto';

const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface GenerateSlugOptions {
  length?: number;
  alphabet?: string;
  minLength?: number;
  maxLength?: number;
}

export function generateSlug(options: GenerateSlugOptions = {}): string {
  const length = options.length ?? 8;
  const alphabet = options.alphabet ?? DEFAULT_ALPHABET;
  const minLength = options.minLength ?? 5;
  const maxLength = options.maxLength ?? 64;

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
