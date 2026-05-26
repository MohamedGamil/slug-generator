import { RandomSlugGenerator } from './core/random.js';
import { TextSlugifier } from './core/sanitize.js';
import { UniqueSlugService } from './core/unique.js';
import { UuidSlugGenerator } from './generators/uuid.js';
import { SnowflakeSlugGenerator } from './generators/snowflake.js';
import { ObfuscatedSequenceSlugGenerator, SlugPoolGenerator } from './structures/pool.js';
import {
  GenerateSlugOptions,
  ToSlugOptions,
  GenerateUniqueSlugOptions,
  SnowflakeOptions,
  ObfuscatedSequenceOptions
} from './types.js';

/**
 * Generates a random secure slug (default length: 8).
 *
 * @param options - Configuration options or target length number.
 */
export function generateSlug(options: GenerateSlugOptions | number = {}): string {
  return RandomSlugGenerator.generate(options);
}

/**
 * Sanitizes arbitrary UTF-8 text into a URL-friendly slug.
 *
 * @param text - The input text to format and sanitize.
 * @param options - Configuration options for character sets, casing, transliteration, and separator details.
 */
export function toSlug(text: string, options: ToSlugOptions = {}): string {
  return TextSlugifier.sanitize(text, options);
}

/**
 * Alias for generateSlug.
 */
export const createSlug = generateSlug;

/**
 * Alias for toSlug.
 */
export const slugify = toSlug;

/**
 * Asynchronously generates a unique secure random slug by validating uniqueness against the exists callback.
 *
 * @param options - Unique slug configuration options, including exists callback validation.
 */
export async function generateUniqueSlug(options: GenerateUniqueSlugOptions): Promise<string> {
  return UniqueSlugService.generate(options);
}

/**
 * Generates a standard random UUIDv4 string.
 *
 * @returns A 36-character standard UUIDv4 string.
 */
export function uuidv4(): string {
  return UuidSlugGenerator.v4();
}

/**
 * Generates a time-ordered UUIDv6 string.
 * Optimized for database index sorting.
 *
 * @returns A 36-character standard UUIDv6 string.
 */
export function uuidv6(): string {
  return UuidSlugGenerator.v6();
}

/**
 * Compacts a standard 36-character UUID string into a URL-safe 22-character Base64 slug.
 *
 * @param uuid - The standard UUID string.
 */
export function uuidSlug(uuid: string): string {
  return UuidSlugGenerator.slugify(uuid);
}

/**
 * Generates a decimal string representation of a 64-bit Snowflake ID.
 *
 * @param options - Custom epoch and worker ID parameters.
 */
export function snowflake(options?: SnowflakeOptions): string {
  return new SnowflakeSlugGenerator(options).generateString();
}

/**
 * Generates a compact base64 URL-safe slug representation of a Snowflake ID.
 *
 * @param options - Custom epoch and worker ID parameters.
 */
export function snowflakeSlug(options?: SnowflakeOptions): string {
  return new SnowflakeSlugGenerator(options).generateSlug();
}

/**
 * Maps a sequential integer counter bijectively to a unique, non-guessable URL slug.
 *
 * @param counter - The non-negative counter value (number or bigint).
 * @param options - Custom alphabet, minLength, multiplier, and modulo configurations.
 */
export function obfuscate(counter: number | bigint, options?: ObfuscatedSequenceOptions): string {
  return new ObfuscatedSequenceSlugGenerator(options).generate(counter);
}

/**
 * Generates a batch of unique random slugs in memory.
 *
 * @param count - The number of unique slugs to generate.
 * @param options - Configuration options or target length number.
 */
export function createSlugBatch(count: number, options?: GenerateSlugOptions | number): string[] {
  return SlugPoolGenerator.generateUniqueBatch(count, options);
}
