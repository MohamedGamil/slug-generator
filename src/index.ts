import { randomBytes } from 'crypto';

const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface GenerateSlugOptions {
  length?: number;
  alphabet?: string;
}

export function generateSlug(options: GenerateSlugOptions = {}): string {
  const length = options.length ?? 8;
  const alphabet = options.alphabet ?? DEFAULT_ALPHABET;

  if (length < 5 || length > 64) {
    throw new Error('Slug length must be between 5 and 64 characters.');
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
