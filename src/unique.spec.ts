import { describe, it, expect } from 'vitest';
import {
  RandomSlugGenerator,
  UuidSlugGenerator,
  SnowflakeSlugGenerator,
  BloomFilter,
  SlugPoolGenerator,
  ObfuscatedSequenceSlugGenerator,
  uuidv4,
  uuidv6,
  uuidSlug,
  snowflake,
  snowflakeSlug,
  obfuscate,
  obfuscateDecode,
  createSlugBatch
} from './index.js';

describe('New Unique Slug Generation Suite', () => {
  
  describe('RandomSlugGenerator.generateBatch', () => {
    it('should generate requested count of slugs', () => {
      const count = 50;
      const slugs = RandomSlugGenerator.generateBatch(count, { length: 10 });
      expect(slugs).toHaveLength(count);
      for (const slug of slugs) {
        expect(slug).toHaveLength(10);
      }
    });

    it('should respect prefix, suffix, and separator in batch generation', () => {
      const slugs = RandomSlugGenerator.generateBatch(5, {
        length: 6,
        prefix: 'pre',
        suffix: 'post',
        separator: '-'
      });
      for (const slug of slugs) {
        expect(slug.startsWith('pre-')).toBe(true);
        expect(slug.endsWith('-post')).toBe(true);
        expect(slug).toHaveLength(15); // 'pre-' (4) + 6 + '-post' (5)
      }
    });

    it('should throw on invalid count', () => {
      expect(() => RandomSlugGenerator.generateBatch(0)).toThrow('Count must be a positive integer.');
      expect(() => RandomSlugGenerator.generateBatch(-5)).toThrow('Count must be a positive integer.');
      expect(() => RandomSlugGenerator.generateBatch(2.5)).toThrow('Count must be a positive integer.');
    });
  });

  describe('UuidSlugGenerator', () => {
    it('should generate valid UUIDv4', () => {
      const uuid = UuidSlugGenerator.v4();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate valid UUIDv6', () => {
      const uuid = UuidSlugGenerator.v6();
      // UUIDv6 format: time-ordered, version 6, variant RFC 4122 (89ab)
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate lexicographically sortable UUIDv6 strings', async () => {
      const uuids: string[] = [];
      for (let i = 0; i < 5; i++) {
        uuids.push(UuidSlugGenerator.v6());
        // Wait briefly if needed, but time-ordered and sequence counter should guarantee sorting
      }
      const sorted = [...uuids].sort();
      expect(uuids).toEqual(sorted);
    });

    it('should compact standard UUID to 22-char base64 url-safe slug', () => {
      const uuid = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
      const slug = UuidSlugGenerator.slugify(uuid);
      expect(slug).toHaveLength(22);
      expect(slug).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });

    it('should throw error for invalid UUID in slugify', () => {
      expect(() => UuidSlugGenerator.slugify('invalid-uuid')).toThrow('Invalid UUID format.');
      expect(() => UuidSlugGenerator.slugify(123 as any)).toThrow('UUID input must be a string.');
    });
  });

  describe('SnowflakeSlugGenerator', () => {
    it('should generate raw bigint and decimal string Snowflake IDs', () => {
      const generator = new SnowflakeSlugGenerator();
      const idBigInt = generator.generate();
      const idString = generator.generateString();
      
      expect(typeof idBigInt).toBe('bigint');
      expect(typeof idString).toBe('string');
      expect(BigInt(idString)).toBeGreaterThan(0n);
    });

    it('should generate compact base64 URL-safe Snowflake slug', () => {
      const generator = new SnowflakeSlugGenerator();
      const slug = generator.generateSlug();
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should respect custom epoch and worker ID configuration', () => {
      const customEpoch = 1609459200000n; // Jan 1, 2021
      const generator = new SnowflakeSlugGenerator({ epoch: customEpoch, workerId: 42 });
      const id = generator.generate();
      
      // Extract worker ID (bits 12 to 21)
      const workerId = (id >> 12n) & 1023n;
      expect(workerId).toBe(42n);
    });

    it('should throw error for invalid worker ID', () => {
      expect(() => new SnowflakeSlugGenerator({ workerId: -1 })).toThrow('Worker ID must be between 0 and 1023.');
      expect(() => new SnowflakeSlugGenerator({ workerId: 1024 })).toThrow('Worker ID must be between 0 and 1023.');
    });

    it('should handle sequence rollover in the same millisecond', () => {
      const generator = new SnowflakeSlugGenerator();
      const ids: bigint[] = [];
      for (let i = 0; i < 100; i++) {
        ids.push(generator.generate());
      }
      
      // All IDs generated consecutively must be unique and strictly increasing
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1]);
      }
    });

    it('should throw error when clock is running backwards', () => {
      const generator = new SnowflakeSlugGenerator({ epoch: Date.now() + 100000 }); // epoch in future
      expect(() => generator.generate()).toThrow('Clock is running backwards or epoch is in the future.');
    });
  });

  describe('BloomFilter', () => {
    it('should add and check elements accurately', () => {
      const filter = new BloomFilter(1000, 0.01);
      
      filter.add('hello');
      filter.add('world');
      
      expect(filter.mightContain('hello')).toBe(true);
      expect(filter.mightContain('world')).toBe(true);
      expect(filter.mightContain('not-exist')).toBe(false);
    });

    it('should serialize and deserialize using export/import', () => {
      const filter = new BloomFilter(100, 0.01);
      filter.add('apple');
      filter.add('banana');

      const serialized = filter.export();
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);

      const importedFilter = BloomFilter.import(serialized, 100, 0.01);
      expect(importedFilter.mightContain('apple')).toBe(true);
      expect(importedFilter.mightContain('banana')).toBe(true);
      expect(importedFilter.mightContain('orange')).toBe(false);
    });

    it('should throw error on invalid import size', () => {
      const filter1 = new BloomFilter(100, 0.01);
      const serialized = filter1.export();
      
      // Importing with a different configuration yields different bit array size
      expect(() => BloomFilter.import(serialized, 500, 0.01)).toThrow(/Imported bits size mismatch/);
    });

    it('should throw error on invalid expected capacity or false positive rate bounds', () => {
      expect(() => new BloomFilter(0)).toThrow('Expected capacity must be a positive integer.');
      expect(() => new BloomFilter(-5)).toThrow('Expected capacity must be a positive integer.');
      expect(() => new BloomFilter(100, 0)).toThrow('False positive rate must be between 0 and 1 (exclusive).');
      expect(() => new BloomFilter(100, 1.5)).toThrow('False positive rate must be between 0 and 1 (exclusive).');
      expect(() => new BloomFilter(100).add(123 as any)).toThrow('Bloom filter items must be strings.');
      expect(() => new BloomFilter(100).mightContain(123 as any)).toThrow('Bloom filter items must be strings.');
      expect(() => BloomFilter.import(123 as any, 100)).toThrow('Serialized data must be a string.');
    });
  });

  describe('SlugPoolGenerator', () => {
    it('should generate a batch of unique slugs', () => {
      const count = 100;
      const slugs = SlugPoolGenerator.generateUniqueBatch(count, { length: 6, alphabet: 'abcde' });
      expect(slugs).toHaveLength(count);
      
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(count);
    });

    it('should simulate filling a database pool and handle duplicates', async () => {
      const existingDb = new Set<string>();
      
      // Simulate database batch insert function with UNIQUE constraints.
      // Inserts only new ones and returns number of inserted rows.
      const insertFn = async (slugs: string[]): Promise<number> => {
        let inserted = 0;
        for (const slug of slugs) {
          if (!existingDb.has(slug)) {
            existingDb.add(slug);
            inserted++;
          }
        }
        return inserted;
      };

      const totalTarget = 50;
      const totalInserted = await SlugPoolGenerator.fillDbPool(totalTarget, insertFn, { length: 5 });
      
      expect(totalInserted).toBe(totalTarget);
      expect(existingDb.size).toBe(totalTarget);
    });

    it('should throw error on invalid pool sizes and counts', () => {
      expect(() => SlugPoolGenerator.generateUniqueBatch(0)).toThrow('Count must be a positive integer.');
      expect(() => SlugPoolGenerator.generateUniqueBatch(-10)).toThrow('Count must be a positive integer.');
      expect(() => SlugPoolGenerator.generateUniqueBatch(5.5)).toThrow('Count must be a positive integer.');
      expect(() => SlugPoolGenerator.generateUniqueBatch(5, { length: 123 as any })).toThrow(/Slug length must be between/);
    });

    it('should throw error on invalid insertFn or non-numeric returns', async () => {
      await expect(SlugPoolGenerator.fillDbPool(0, async () => 0)).rejects.toThrow('Count must be a positive integer.');
      await expect(SlugPoolGenerator.fillDbPool(10, null as any)).rejects.toThrow('insertFn must be a function.');
      await expect(SlugPoolGenerator.fillDbPool(10, async () => 'not-a-number' as any)).rejects.toThrow(/insertFn must resolve to a non-negative number/);
      await expect(SlugPoolGenerator.fillDbPool(10, async () => -1)).rejects.toThrow(/insertFn must resolve to a non-negative number/);
    });

    it('should abort to prevent infinite loop if insertFn consistently returns 0', async () => {
      await expect(SlugPoolGenerator.fillDbPool(10, async () => 0)).rejects.toThrow(/insertFn returned 0 inserted slugs 5 times consecutively/);
    });
  });

  describe('ObfuscatedSequenceSlugGenerator', () => {
    it('should generate unique deterministically obfuscated slugs', () => {
      const generator = new ObfuscatedSequenceSlugGenerator();
      
      const slug1 = generator.generate(1);
      const slug2 = generator.generate(2);
      const slug3 = generator.generate(3);
      
      expect(slug1).not.toBe(slug2);
      expect(slug2).not.toBe(slug3);
      expect(slug1).toHaveLength(6);
      
      // Determinism test
      expect(generator.generate(1)).toBe(slug1);
    });

    it('should respect custom alphabet and minLength configurations', () => {
      const generator = new ObfuscatedSequenceSlugGenerator({
        alphabet: 'abc',
        minLength: 10
      });
      
      const slugPadded = generator.generate(0);
      expect(slugPadded).toHaveLength(10); // padded to minLength
      expect(slugPadded).toBe('aaaaaaaaaa');

      const slug = generator.generate(100);
      expect(slug.length).toBeGreaterThanOrEqual(10);
      for (const char of slug) {
        expect('abc').toContain(char);
      }
    });

    it('should throw on invalid configurations and negative counter', () => {
      expect(() => new ObfuscatedSequenceSlugGenerator({ alphabet: 'a' })).toThrow('Alphabet length must be at least 2.');
      expect(() => new ObfuscatedSequenceSlugGenerator({ minLength: 0 })).toThrow('Minimum length must be at least 1.');
      expect(() => new ObfuscatedSequenceSlugGenerator({ modulo: -10n })).toThrow('Modulo must be positive.');
      expect(() => new ObfuscatedSequenceSlugGenerator({ multiplier: -5n })).toThrow('Multiplier must be positive.');

      const generator = new ObfuscatedSequenceSlugGenerator();
      expect(() => generator.generate(-1)).toThrow('Counter must be a non-negative value.');
    });

    it('should decode scrambled slugs back to their original counter values', () => {
      const generator = new ObfuscatedSequenceSlugGenerator();
      
      const testCases = [0n, 1n, 42n, 123456n, 4294967295n];
      for (const counter of testCases) {
        const slug = generator.generate(counter);
        const decoded = generator.decode(slug);
        expect(decoded).toBe(counter);
      }
    });

    it('should throw error when decoding invalid slugs', () => {
      const generator = new ObfuscatedSequenceSlugGenerator();
      expect(() => generator.decode(123 as any)).toThrow('Slug input must be a string.');
      expect(() => generator.decode('invalid@slug')).toThrow("Character '@' is not in the configured alphabet.");
    });

    it('should throw error if multiplier and modulo are not coprime', () => {
      expect(() => new ObfuscatedSequenceSlugGenerator({ multiplier: 2n, modulo: 4n })).toThrow(/coprime/);
    });
  });

  describe('Shorthand Functional Helpers', () => {
    it('should generate UUIDs and slugs using shorthand functions', () => {
      expect(uuidv4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(uuidv6()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(uuidSlug('f81d4fae-7dec-11d0-a765-00a0c91e6bf6')).toHaveLength(22);
    });

    it('should generate Snowflake IDs and slugs using shorthand functions', () => {
      const idStr = snowflake();
      expect(typeof idStr).toBe('string');
      expect(BigInt(idStr)).toBeGreaterThan(0n);

      const slug = snowflakeSlug();
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should obfuscate sequential counters using shorthand function', () => {
      const slug = obfuscate(100);
      expect(slug).toHaveLength(6); // default minLength
      const decoded = obfuscateDecode(slug);
      expect(decoded).toBe(100n);
    });

    it('should generate unique batch of slugs using shorthand function', () => {
      const batch = createSlugBatch(10, { length: 6 });
      expect(batch).toHaveLength(10);
      const unique = new Set(batch);
      expect(unique.size).toBe(10);
    });
  });

});
