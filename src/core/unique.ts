import { RandomSlugGenerator } from './random.js';
import { GenerateUniqueSlugOptions } from '../types.js';

/**
 * Service class that coordinates unique slug generation.
 * Handles collision retries and validates uniqueness against an external callback logic.
 */
export class UniqueSlugService {
  /**
   * Generates a unique secure random slug by evaluating the exists uniqueness check.
   *
   * @param options - Configuration options, including exists callback validation and maxRetries boundary.
   * @returns A promise that resolves to a unique secure random slug.
   * @throws Error if validation parameters are invalid, callback is missing, or unique slug cannot be found within retry limit.
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

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const slug = RandomSlugGenerator.generate(options);
      const taken = await options.exists(slug);
      if (!taken) {
        return slug;
      }
    }

    throw new Error(`Failed to generate a unique slug after ${maxRetries} attempts.`);
  }
}
