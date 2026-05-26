import { RandomSlugGenerator } from '../core/random.js';
import { GenerateSlugOptions, ObfuscatedSequenceOptions } from '../types.js';

/**
 * Service class for managing unique slug pools.
 * Allows pre-generating unique batches and populating external database pools.
 */
export class SlugPoolGenerator {
  /**
   * Generates a batch of random slugs, guaranteeing that all slugs within the returned batch are unique.
   *
   * @param count - The number of unique slugs to generate. Must be a positive integer.
   * @param options - Configuration options or target length number.
   * @returns An array of unique random slugs.
   * @throws Error if count is invalid or options configuration fails validation.
   */
  public static generateUniqueBatch(count: number, options: GenerateSlugOptions | number = {}): string[] {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('Count must be a positive integer.');
    }

    const uniqueSlugs = new Set<string>();
    
    while (uniqueSlugs.size < count) {
      const needed = count - uniqueSlugs.size;
      // Generate slightly more to account for potential duplicates (though extremely rare)
      const batchSize = Math.max(needed, 10);
      const batch = RandomSlugGenerator.generateBatch(batchSize, options);
      for (const slug of batch) {
        uniqueSlugs.add(slug);
        if (uniqueSlugs.size === count) {
          break;
        }
      }
    }

    return Array.from(uniqueSlugs);
  }

  /**
   * Fills a database/external pool of unique slugs using a batch generation and insertion function.
   * The insertFn is responsible for inserting the slugs (e.g., using INSERT IGNORE or ON CONFLICT DO NOTHING)
   * and returning the number of successfully inserted slugs.
   * This method runs until the requested number of unique slugs has been successfully inserted.
   *
   * @param count - The total target number of unique slugs to successfully insert. Must be a positive integer.
   * @param insertFn - Callback to insert slugs and return the number of successfully inserted rows.
   * @param options - Configuration options or target length number.
   * @returns Promise resolving to the total count of successfully inserted slugs.
   * @throws Error if insertFn is missing, returns invalid counts, or consecutively inserts 0 rows too many times.
   */
  public static async fillDbPool(
    count: number,
    insertFn: (slugs: string[]) => Promise<number>,
    options: GenerateSlugOptions | number = {}
  ): Promise<number> {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('Count must be a positive integer.');
    }
    if (typeof insertFn !== 'function') {
      throw new Error('insertFn must be a function.');
    }

    let totalInserted = 0;
    let consecutiveZeros = 0;

    while (totalInserted < count) {
      const needed = count - totalInserted;
      // We chunk generation/insertion to reasonable batch sizes (e.g., max 1000 at a time)
      const batchLimit = Math.min(needed, 1000);
      const slugs = this.generateUniqueBatch(batchLimit, options);
      const inserted = await insertFn(slugs);
      
      if (typeof inserted !== 'number' || inserted < 0) {
        throw new Error('insertFn must resolve to a non-negative number indicating successfully inserted slugs.');
      }
      
      if (inserted === 0) {
        consecutiveZeros++;
        if (consecutiveZeros >= 5) {
          throw new Error('insertFn returned 0 inserted slugs 5 times consecutively. Aborting to prevent infinite loop.');
        }
      } else {
        consecutiveZeros = 0;
        totalInserted += inserted;
      }
    }

    return totalInserted;
  }
}

/**
 * Generator that maps sequential integer counters bijectively to guaranteed unique, non-guessable slugs.
 * Employs Knuth's multiplicative hashing to scramble sequential IDs at high performance ($O(1)$).
 */
export class ObfuscatedSequenceSlugGenerator {
  private alphabet: string;
  private minLength: number;
  private multiplier: bigint;
  private modulo: bigint;
  private inverse: bigint;
  private charIndexMap: Map<string, number>;

  /**
   * Initializes a new ObfuscatedSequenceSlugGenerator instance.
   *
   * @param options - Configuration options containing alphabet, minLength, multiplier, and modulo divisor.
   * @throws Error if alphabet size, minLength, modulo, or multiplier values are invalid, or if multiplier/modulo are not coprime.
   */
  constructor(options: ObfuscatedSequenceOptions = {}) {
    this.alphabet = options.alphabet ?? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    this.minLength = options.minLength ?? 6;
    
    // Knuth's multiplicative hashing defaults (using a prime co-prime with 2^32 or 2^64)
    // By default modulo is 2^32 (4294967296n) and multiplier is 2654435761n
    this.modulo = options.modulo ?? 4294967296n;
    this.multiplier = options.multiplier ?? 2654435761n;

    if (this.alphabet.length < 2) {
      throw new Error('Alphabet length must be at least 2.');
    }
    if (this.minLength < 1) {
      throw new Error('Minimum length must be at least 1.');
    }
    if (this.modulo <= 0n) {
      throw new Error('Modulo must be positive.');
    }
    if (this.multiplier <= 0n) {
      throw new Error('Multiplier must be positive.');
    }

    // Initialize character index map for fast reverse decoding lookup
    this.charIndexMap = new Map<string, number>();
    for (let i = 0; i < this.alphabet.length; i++) {
      this.charIndexMap.set(this.alphabet[i], i);
    }

    // Compute the modular multiplicative inverse to enable decoding
    try {
      this.inverse = this.modularInverse(this.multiplier, this.modulo);
    } catch {
      throw new Error('Multiplier and Modulo must be coprime to support decoding.');
    }
  }

  /**
   * Generates a guaranteed unique and obfuscated slug from a sequential counter.
   *
   * @param counter - A non-negative counter value (number or bigint).
   * @returns A guaranteed unique scrambled slug string.
   * @throws Error if counter is negative.
   */
  public generate(counter: number | bigint): string {
    const c = BigInt(counter);
    if (c < 0n) {
      throw new Error('Counter must be a non-negative value.');
    }
    
    // Scramble the sequence bijectively: (c * multiplier) % modulo
    const scrambled = (c * this.multiplier) % this.modulo;
    
    return this.encodeBase(scrambled);
  }

  /**
   * Decodes an obfuscated slug back into its original sequence counter value.
   *
   * @param slug - The scrambled slug to decode.
   * @returns The original counter value as a BigInt.
   * @throws Error if the slug is not a string, or contains characters outside the configured alphabet.
   */
  public decode(slug: string): bigint {
    if (typeof slug !== 'string') {
      throw new Error('Slug input must be a string.');
    }
    const scrambled = this.decodeBase(slug);
    // Reverse the multiplication: (scrambled * inverse) % modulo
    return (scrambled * this.inverse) % this.modulo;
  }

  /**
   * Encodes a bigint scrambled integer into base of alphabet length, left-padded to minLength.
   */
  private encodeBase(num: bigint): string {
    let result = '';
    const base = BigInt(this.alphabet.length);
    let n = num;
    
    if (n === 0n) {
      result = this.alphabet[0];
    } else {
      while (n > 0n) {
        result = this.alphabet[Number(n % base)] + result;
        n = n / base;
      }
    }
    
    return result.padStart(this.minLength, this.alphabet[0]);
  }

  /**
   * Decodes an alphabet-encoded string back into its scrambled BigInt value.
   */
  private decodeBase(slug: string): bigint {
    let num = 0n;
    const base = BigInt(this.alphabet.length);
    
    for (let i = 0; i < slug.length; i++) {
      const charIdx = this.charIndexMap.get(slug[i]);
      if (charIdx === undefined) {
        throw new Error(`Character '${slug[i]}' is not in the configured alphabet.`);
      }
      num = num * base + BigInt(charIdx);
    }
    return num;
  }

  /**
   * Computes the modular multiplicative inverse of a modulo m using the Extended Euclidean Algorithm.
   * Throws an error if they are not coprime.
   */
  private modularInverse(a: bigint, m: bigint): bigint {
    let t = 0n;
    let newT = 1n;
    let r = m;
    let newR = a;

    while (newR !== 0n) {
      const quotient = r / newR;
      
      const tempT = t;
      t = newT;
      newT = tempT - quotient * newT;

      const tempR = r;
      r = newR;
      newR = tempR - quotient * newR;
    }

    if (r > 1n) {
      throw new Error('a and m are not coprime');
    }
    if (t < 0n) {
      t = t + m;
    }
    return t;
  }
}
