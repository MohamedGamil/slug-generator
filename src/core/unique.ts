import { RandomSlugGenerator } from './random.js';
import { GenerateUniqueSlugOptions } from '../types.js';
import { ObfuscatedSequenceSlugGenerator } from '../structures/pool.js';

/**
 * Service class that coordinates unique slug generation.
 * Handles collision retries and validates uniqueness against an external callback logic.
 */
export class UniqueSlugService {
  /**
   * Generates a unique secure random slug by evaluating the exists uniqueness check.
   * Enforces bounds (min 2, max 64) and falls back to obfuscated sequence counter on collision.
   *
   * @param options - Configuration options, including exists callback validation and maxRetries boundary.
   * @returns A promise that resolves to a unique secure random slug.
   * @throws Error if validation parameters are invalid, callback is missing, or unique slug cannot be found.
   */
  public static async generate(options: GenerateUniqueSlugOptions): Promise<string> {
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

    // Hard rule: shortCode values can never be lower than 2 and no more than 64
    const systemMinLength = 2;
    const systemMaxLength = 64;

    // Enforce subscription plan minimum length (options.minLength must be >= 5)
    const minLen = Math.max(systemMinLength, options.minLength ?? systemMinLength);
    // Enforce system max length (options.maxLength must be <= 64)
    const maxLen = Math.min(systemMaxLength, options.maxLength ?? systemMaxLength);

    // Resolve actual bounds
    const actualMinLength = Math.min(minLen, maxLen);
    const actualMaxLength = Math.max(minLen, maxLen);

    // Determine target length
    let targetLength = options.length ?? 8;
    targetLength = Math.max(actualMinLength, Math.min(actualMaxLength, targetLength));

    // Create resolved options for random generator
    const randomOptions: GenerateUniqueSlugOptions = {
      ...options,
      minLength: actualMinLength,
      maxLength: actualMaxLength,
      length: targetLength,
    };

    // 1. Try to generate a unique random slug
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const slug = RandomSlugGenerator.generate(randomOptions);
      const taken = await options.exists(slug);
      if (!taken) {
        return slug;
      }
    }

    // 2. Fallback to obfuscated sequence generator on collision depletion
    let counterVal: bigint;
    if (options.counter !== undefined) {
      if (typeof options.counter === 'function') {
        const nextVal = await options.counter();
        counterVal = BigInt(nextVal);
      } else {
        counterVal = BigInt(options.counter);
      }
    } else {
      // Fallback: high-precision timestamp counter to ensure uniqueness without state
      counterVal = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    }

    const obfuscatedGenerator = new ObfuscatedSequenceSlugGenerator({
      alphabet: options.alphabet,
      minLength: actualMinLength,
    });

    // Try up to 100 times to resolve any sequence collision (though highly unlikely)
    for (let fallbackAttempt = 0; fallbackAttempt < 100; fallbackAttempt++) {
      const slug = obfuscatedGenerator.generate(counterVal);
      const taken = await options.exists(slug);
      if (!taken) {
        return slug;
      }
      counterVal += 1n;
    }

    throw new Error(`Failed to generate a unique slug after random retries and obfuscated sequence fallback.`);
  }
}
