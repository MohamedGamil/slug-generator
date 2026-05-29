import { describe, it, expect, vi } from 'vitest';
import {
  toSlug,
  SnowflakeSlugGenerator,
  ObfuscatedSequenceSlugGenerator,
  RandomSlugGenerator,
  BloomFilter,
  SlugPoolGenerator,
  getRandomBytes,
  mixEntropy,
  generateUniqueSlug
} from './index.js';

describe('Additional Coverage Tests', () => {

  describe('TextSlugifier.sanitize fallback %AUTO%', () => {
    it('should generate a random slug when fallback is %AUTO% and result is empty', () => {
      const slug = toSlug('!!!', { fallback: '%AUTO%' });
      expect(slug).toBeDefined();
      expect(slug.length).toBeGreaterThanOrEqual(5);
    });

    it('should generate a random slug when fallback is %auto% and result is too short', () => {
      const slug = toSlug('a', { minLength: 5, fallback: '%auto%' });
      expect(slug).toBeDefined();
      expect(slug.length).toBeGreaterThanOrEqual(5);
    });

    it('should cover trimRegExp null branch', () => {
      // Exploit double evaluation of opts.separator in sanitize.ts:
      // const separator = typeof opts.separator === 'string' ? opts.separator : '-';
      // First call returns '-' (so typeof is 'string'), second call returns undefined.
      let separatorCallCount = 0;
      const customOpts = {
        get separator() {
          separatorCallCount++;
          if (separatorCallCount === 1) {
            return '-';
          }
          return undefined;
        },
        preserveSpace: false
      };
      
      const slug = toSlug('hello-world', customOpts as any);
      expect(slug).toBe('helloundefinedworld');
    });
  });

  describe('SnowflakeSlugGenerator edge cases', () => {
    it('should handle base64UrlEncode with 0n', () => {
      const encoded = SnowflakeSlugGenerator.base64UrlEncode(0n);
      expect(encoded).toBe('A');
    });

    it('should throw when epoch is in the future (clock running backwards)', () => {
      const futureEpoch = Date.now() + 100000;
      const generator = new SnowflakeSlugGenerator({ epoch: futureEpoch });
      expect(() => generator.generate()).toThrow('Clock is running backwards or epoch is in the future.');
    });

    it('should wait for next millisecond on sequence overflow', () => {
      // Mock Date.now to return a constant for the first 4100 calls, then increment
      let time = 1767225600000; // default epoch
      let calls = 0;
      const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
        calls++;
        if (calls > 4100) {
          time += 5; // advance time to break the wait loop
        }
        return time;
      });

      const generator = new SnowflakeSlugGenerator({ epoch: 1767225000000n });
      const ids = new Set<bigint>();
      // Generate 4105 IDs consecutively, which forces sequence overflow in the "same" millisecond
      for (let i = 0; i < 4105; i++) {
        ids.add(generator.generate());
      }
      expect(ids.size).toBe(4105);
      dateSpy.mockRestore();
    });
  });

  describe('ObfuscatedSequenceSlugGenerator coprime error and decoding validation', () => {
    it('should throw if multiplier and modulo are not coprime', () => {
      expect(() => new ObfuscatedSequenceSlugGenerator({
        multiplier: 2n,
        modulo: 4n
      })).toThrow('Multiplier and Modulo must be coprime to support decoding.');
    });

    it('should trigger modular inverse negative t branch', () => {
      // multiplier: 2n, modulo: 5n triggers modular inverse t < 0n (t = -2, gets adjusted to 3)
      const generator = new ObfuscatedSequenceSlugGenerator({
        multiplier: 2n,
        modulo: 5n
      });
      // Verification: inverse of 2 mod 5 is 3. (2 * 3) % 5 = 1.
      expect(generator.generate(1)).toBeDefined();
    });

    it('should throw decode errors on non-string inputs', () => {
      const generator = new ObfuscatedSequenceSlugGenerator();
      expect(() => generator.decode(null as any)).toThrow('Slug input must be a string.');
      expect(() => generator.decode(123 as any)).toThrow('Slug input must be a string.');
    });

    it('should throw decode errors when characters are not in alphabet', () => {
      const generator = new ObfuscatedSequenceSlugGenerator();
      expect(() => generator.decode('abc!123')).toThrow("Character '!' is not in the configured alphabet.");
    });
  });

  describe('RandomSlugGenerator validation and branch coverage', () => {
    it('should throw error for non-integer length parameters in generateBatch', () => {
      expect(() => RandomSlugGenerator.generateBatch(5, { length: 5.5 })).toThrow('Length must be an integer.');
      expect(() => RandomSlugGenerator.generateBatch(5, { minLength: 3.5 })).toThrow('Minimum slug length configuration must be an integer.');
      expect(() => RandomSlugGenerator.generateBatch(5, { maxLength: 10.5 })).toThrow('Maximum slug length configuration must be an integer.');
    });

    it('should throw error for invalid alphabet in generateBatch', () => {
      expect(() => RandomSlugGenerator.generateBatch(5, { alphabet: '' })).toThrow('Alphabet option must be a non-empty string.');
      expect(() => RandomSlugGenerator.generateBatch(5, { alphabet: [] as any })).toThrow('Alphabet option must be a non-empty string.');
    });

    it('should throw error for out of bounds bounds in generateBatch', () => {
      expect(() => RandomSlugGenerator.generateBatch(5, { minLength: 1 })).toThrow('Minimum slug length configuration cannot be less than 2.');
      expect(() => RandomSlugGenerator.generateBatch(5, { maxLength: 65 })).toThrow('Maximum slug length configuration cannot exceed 64.');
      expect(() => RandomSlugGenerator.generateBatch(5, { minLength: 10, maxLength: 5 })).toThrow('Minimum slug length cannot be greater than maximum slug length.');
      expect(() => RandomSlugGenerator.generateBatch(5, { length: 4, minLength: 5 })).toThrow('Slug length must be between 5 and 64 characters.');
    });

    it('should validate prefix, suffix, and separator strings in generateBatch', () => {
      expect(() => RandomSlugGenerator.generateBatch(5, { prefix: 123 as any })).toThrow('Prefix option must be a string.');
      expect(() => RandomSlugGenerator.generateBatch(5, { prefix: 'abc@' })).toThrow("Prefix character '@' is not URL safe.");
      expect(() => RandomSlugGenerator.generateBatch(5, { suffix: 123 as any })).toThrow('Suffix option must be a string.');
      expect(() => RandomSlugGenerator.generateBatch(5, { suffix: 'abc@' })).toThrow("Suffix character '@' is not URL safe.");
      expect(() => RandomSlugGenerator.generateBatch(5, { separator: 123 as any })).toThrow('Separator option must be a string.');
      expect(() => RandomSlugGenerator.generateBatch(5, { separator: 'ab' })).toThrow('Separator must be exactly 1 character long.');
      expect(() => RandomSlugGenerator.generateBatch(5, { separator: '@' })).toThrow("Separator character '@' is not URL safe.");
    });

    it('should trigger refill branch when batch generation exceeds buffer due to high rejection rate', () => {
      // Use alphabet size 129 where limit is 129 (rejection probability of 49.6%)
      // With count = 1 and length = 64, running this 100 times guarantees triggering the refill block
      // without exceeding the 65,536 bytes limit of Web Crypto API
      const alphabet = 'a'.repeat(129);
      for (let i = 0; i < 100; i++) {
        RandomSlugGenerator.generateBatch(1, { length: 64, alphabet });
      }
    });
  });

  describe('UniqueSlugService advanced branches', () => {
    it('should accept async/sync function for counter options', async () => {
      let callCount = 0;
      const unique = await generateUniqueSlug({
        length: 5,
        exists: async () => callCount++ < 5, // force 5 retries to trigger fallback
        counter: async () => 2000n,
        maxRetries: 5
      });
      expect(unique).toBeDefined();
    });

    it('should throw error when all retries and fallback attempts collide', async () => {
      await expect(generateUniqueSlug({
        length: 5,
        exists: async () => true, // every slug is taken
        maxRetries: 3
      })).rejects.toThrow('Failed to generate a unique slug after random retries and obfuscated sequence fallback.');
    });

    it('should validate maxRetries parameter', async () => {
      await expect(generateUniqueSlug({
        exists: () => false,
        maxRetries: 0
      })).rejects.toThrow('maxRetries must be a positive integer.');

      await expect(generateUniqueSlug({
        exists: () => false,
        maxRetries: 2.5
      })).rejects.toThrow('maxRetries must be a positive integer.');
    });
  });

  describe('BloomFilter validation & edge cases', () => {
    it('should throw error when expectedCapacity or falsePositiveRate are invalid', () => {
      expect(() => new BloomFilter(0)).toThrow('Expected capacity must be a positive integer.');
      expect(() => new BloomFilter(10, 0n as any)).toThrow('False positive rate must be between 0 and 1 (exclusive).');
    });

    it('should throw error when items are not strings', () => {
      const filter = new BloomFilter(100);
      expect(() => filter.add(123 as any)).toThrow('Bloom filter items must be strings.');
      expect(() => filter.mightContain(123 as any)).toThrow('Bloom filter items must be strings.');
    });

    it('should throw error when importing non-string or size mismatch data', () => {
      expect(() => BloomFilter.import(123 as any, 100)).toThrow('Serialized data must be a string.');
      
      const filter1 = new BloomFilter(10);
      const serialized = filter1.export();
      expect(() => BloomFilter.import(serialized, 1000)).toThrow('Imported bits size mismatch.');
    });
  });

  describe('SlugPoolGenerator validation', () => {
    it('should throw error on invalid pool sizes and counts', () => {
      expect(() => SlugPoolGenerator.generateUniqueBatch(0)).toThrow('Count must be a positive integer.');
      expect(() => SlugPoolGenerator.generateUniqueBatch(-5)).toThrow('Count must be a positive integer.');
      expect(() => SlugPoolGenerator.generateUniqueBatch(1.5)).toThrow('Count must be a positive integer.');
    });

    it('should throw error on invalid insertFn or non-numeric returns', async () => {
      await expect(SlugPoolGenerator.fillDbPool(0, async () => 0)).rejects.toThrow('Count must be a positive integer.');
      await expect(SlugPoolGenerator.fillDbPool(10, null as any)).rejects.toThrow('insertFn must be a function.');
      await expect(SlugPoolGenerator.fillDbPool(10, async () => 'not-a-number' as any)).rejects.toThrow('insertFn must resolve to a non-negative number');
      await expect(SlugPoolGenerator.fillDbPool(10, async () => -1)).rejects.toThrow('insertFn must resolve to a non-negative number');
    });

    it('should abort to prevent infinite loop if insertFn consistently returns 0', async () => {
      await expect(SlugPoolGenerator.fillDbPool(10, async () => 0)).rejects.toThrow('insertFn returned 0 inserted slugs 5 times consecutively. Aborting to prevent infinite loop.');
    });
  });

  describe('Random and Entropy Helpers', () => {
    it('should get random bytes and mix entropy', () => {
      const bytes = getRandomBytes(10);
      expect(bytes).toHaveLength(10);

      const clone = new Uint8Array(bytes);
      mixEntropy(clone);
      // It should change the values (extremely high probability)
      expect(clone).not.toEqual(bytes);
    });
  });

  describe('UuidSlugGenerator mock environment fallbacks', () => {
    it('should cover fallback catch blocks in uuid.ts module loading', async () => {
      const mockState = { shouldThrow: true };
      
      vi.resetModules();
      vi.doMock('./core/random.js', () => ({
        getRandomBytes: (size: number) => {
          if (mockState.shouldThrow) {
            throw new Error('Simulated crypto error');
          }
          const arr = new Uint8Array(size);
          for (let i = 0; i < size; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        }
      }));

      // Static resolution works fine with static path
      const { UuidSlugGenerator: MockUuidSlugGenerator } = await import('./generators/uuid.js');
      
      // Stop throwing for subsequent v4 and v6 execution
      mockState.shouldThrow = false;
      
      expect(MockUuidSlugGenerator.v4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(MockUuidSlugGenerator.v6()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      vi.doUnmock('./core/random.js');
      vi.resetModules();
    });
  });

  describe('RandomSlugGenerator environment fallbacks', () => {
    it('should cover browser and Math.random fallback paths in random.ts module loading', async () => {
      // Use vi.stubGlobal to safely mock the global crypto object
      vi.stubGlobal('crypto', undefined);
      
      vi.resetModules();
      // First, mock require('crypto') to return object without randomBytes
      vi.doMock('crypto', () => ({}));
      
      // Dynamically load random.ts to trigger the fallback console.warn and Math.random path
      const { RandomSlugGenerator: MockGenerator } = await import('./core/random.js');
      
      // Verify Math.random fallback works
      const slug = MockGenerator.generate();
      expect(slug).toHaveLength(8);
      
      // Cleanup
      vi.doUnmock('crypto');
      vi.unstubAllGlobals();
      vi.resetModules();
    });
  });
});
