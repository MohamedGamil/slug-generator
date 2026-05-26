# Slug Generator

A powerful, light-weight, zero-dependency utility package for generating random cryptographically secure slugs, sanitizing arbitrary UTF-8 text into URL-safe formats with configurable constraints, and providing highly scalable unique slug generation tools (UUID, Snowflake, Bloom Filters, Batch Pools, and Obfuscated Counters).

## Features

- **Secure Slug Generation**: Create cryptographically secure random identifier strings using a bias-free selection algorithm.
- **Unique Slug Generation**: Generate unique slugs asynchronously using a customizable uniqueness validation callback.
- **Prefix, Suffix & Separators**: Configure prefix, suffix, and custom separators for generated random slugs.
- **Unicode-safe Text Sanitization**: Normalize and convert arbitrary strings into URL-safe slugs with accented characters properly handled.
- **Preserve Unicode**: Option to keep non-ASCII Unicode letters and numbers in the sanitized slug.
- **Phonetic Transliteration**: Convert non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew, Japanese Hiragana/Katakana, common Chinese Hanzi, and common Korean Hangul) to their phonetic spoken ASCII equivalents.
- **Casing Controls**: Toggle lowercase, uppercase, or preserve casing.
- **Regex & String Allowed Characters**: Pass custom allowed characters via literal strings or regular expressions.
- **UUID Slug Generator**: Generate standard UUIDv4, time-ordered sortable UUIDv6, and compact 22-character Base64 URL-safe slug representations of UUIDs.
- **Snowflake ID Slug Generator**: Generate Twitter-compatible 64-bit Snowflake IDs as bigints, decimal strings, or compact URL-safe base64 slugs with automatic millisecond rollover.
- **In-Memory Bloom Filter**: Space-efficient membership testing using MurmurHash3 and Base64 export/import serialization to offload database query load.
- **Unique Batch Pools**: Pre-generate unique random slugs in memory or seed database pools with batch conflict resolution.
- **Obfuscated Sequence Counters**: Map auto-incrementing integers bijectively to guaranteed unique, non-guessable slugs using Knuth's multiplicative hashing (zero read-before-write queries).
- **Modern Module Resolution**: Fully supports ESM imports and typed exports natively.
- **Multi-Environment Support**: Fully compatible with browsers, Node.js, and serverless environments. Node.js is completely optional.

## Installation

```bash
pnpm add @mgamil/slug-generator
# or
npm install @mgamil/slug-generator
```

## Quick Start

### 1. Generating Random Slugs

```typescript
import { generateSlug } from '@mgamil/slug-generator';

// Generates a random secure slug (default length: 8, bias-free)
const randomId = generateSlug();
console.log(randomId); // e.g. "aX9_z-pL"

// Generate with a direct custom length (e.g. 12)
const customLenId = generateSlug(12);
console.log(customLenId); // e.g. "xQ9mZp2aKz1w"

// Generate with prefix, suffix, and separator
const prefixedId = generateSlug({
  length: 6,
  prefix: 'invite',
  suffix: 'promo',
  separator: '_'
});
console.log(prefixedId); // e.g. "invite_K9xP2m_promo"
```

### 2. Generating Unique Slugs (Database Verification)

```typescript
import { generateUniqueSlug } from '@mgamil/slug-generator';

const slug = await generateUniqueSlug({
  length: 10,
  exists: async (val) => {
    // Check in database
    return await db.posts.exists({ where: { slug: val } });
  }
});
```

### 3. Sanitizing Text to Slugs

```typescript
import { toSlug, slugify } from '@mgamil/slug-generator';

// Standard sanitization
const slug = toSlug('Hello World! 🌟');
console.log(slug); // "hello-world"

// Preserving Unicode characters (letters and numbers)
const unicodeSlug = toSlug('Café déjà vu مرحبا', { preserveUnicode: true });
console.log(unicodeSlug); // "café-déjà-vu-مرحبا"

// Custom Casing and Regular Expression Allowed Characters
const customSlug = toSlug('product.code#1234', {
  uppercase: true,
  allowedChars: /[.#]/
});
console.log(customSlug); // "PRODUCT.CODE#1234"
```

### 4. Shorthand easy helpers

For quick access, you can use these simple, easy-to-remember shorthand functions to access all unique slug generation features directly:

```typescript
import {
  uuidv4,
  uuidv6,
  uuidSlug,
  snowflake,
  snowflakeSlug,
  obfuscate,
  obfuscateDecode,
  createSlugBatch
} from '@mgamil/slug-generator';

// 1. UUID Shorthands
const v4 = uuidv4(); // "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
const v6 = uuidv6(); // "1e11d07d-ecfa-6000-a765-00a0c91e6bf6"
const slug1 = uuidSlug(v4); // "OB1Prn3sEdCnZQCgyR5r9g"

// 2. Snowflake Shorthands
const sfStr = snowflake(); // "3471034444"
const sfSlug = snowflakeSlug(); // "dI-8a"

// 3. Counter Obfuscation Shorthand
const scrambledSlug = obfuscate(1); // "dI-8aK"
const originalCounter = obfuscateDecode(scrambledSlug); // 1n

// 4. Batch Memory Pool Shorthand
const batch = createSlugBatch(100, { length: 6 });
```

---

## Unique Slug Generator Suites

For large-scale applications (e.g., URL shorteners), the package provides high-performance class-based tools to guarantee uniqueness with zero database reads.

### 1. Obfuscated Sequence Counters (Recommended)
Map sequential counters (like an auto-incrementing database ID or Snowflake ID) bijectively to unique, scrambled base64-like slugs. This guarantees uniqueness and prevents guessability without running read queries.

```typescript
import { ObfuscatedSequenceSlugGenerator } from '@mgamil/slug-generator';

const generator = new ObfuscatedSequenceSlugGenerator({
  minLength: 6,
  alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
});

// Always deterministic, guaranteed 100% collision-free
const slug = generator.generate(1); // "dI-8aK"
console.log(slug);

// Reverses the obfuscation back to the original value
const original = generator.decode(slug); // 1n
console.log(original);
```

### 2. UUID Slug Generator
Generate standard UUIDv4, database-friendly time-ordered sortable UUIDv6, or compact them into 22-character URL slugs.

```typescript
import { UuidSlugGenerator } from '@mgamil/slug-generator';

// Standard UUIDv4
const uuidV4 = UuidSlugGenerator.v4(); // "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"

// Compact 22-char URL safe slug
const compactSlug = UuidSlugGenerator.slugify(uuidV4); // "OB1Prn3sEdCnZQCgyR5r9g"

// Time-ordered sortable UUIDv6
const uuidV6 = UuidSlugGenerator.v6(); // "1e11d07d-ecfa-6000-a765-00a0c91e6bf6"
```

### 3. Snowflake Slug Generator
Twitter-compatible 64-bit Snowflake IDs containing timestamps, worker/machine ID, and sequence rollover bits.

```typescript
import { SnowflakeSlugGenerator } from '@mgamil/slug-generator';

const generator = new SnowflakeSlugGenerator({
  workerId: 42,
  epoch: 1767225600000n // Jan 1, 2026
});

// Raw bigint ID
const bigintId = generator.generate(); // 3471034444n

// Decimal string ID
const stringId = generator.generateString(); // "3471034444"

// URL-safe base64 encoded compact slug
const slug = generator.generateSlug(); // "dI-8a"
```

### 4. In-Memory Bloom Filter
An extremely space-efficient filter used to check if a generated slug already exists. By maintaining a Bloom Filter locally in memory, you can avoid 99% of database read checks (0% false negatives, ~1% false positives).

```typescript
import { BloomFilter } from '@mgamil/slug-generator';

// Create a filter expecting 1 million elements with a 1% false positive rate
const filter = new BloomFilter(1000000, 0.01);

// Add items
filter.add('hello-world');

// Check membership (probabilistic check)
if (!filter.mightContain('unique-slug')) {
  // 100% guaranteed unique! Save to DB directly without read verification
}

// Export / Import states
const serialized = filter.export(); // Serialized base64 string
const newFilter = BloomFilter.import(serialized, 1000000, 0.01);
```

### 5. Out-of-Band Database Pools
Generate batches of unique slugs in memory to seed database pools asynchronously.

```typescript
import { SlugPoolGenerator } from '@mgamil/slug-generator';

// 1. Generate a batch of unique random slugs in memory
const batch = SlugPoolGenerator.generateUniqueBatch(1000, { length: 6 });

// 2. Feed an external database pool asynchronously
await SlugPoolGenerator.fillDbPool(5000, async (slugs) => {
  // Execute a bulk insert using IGNORE or ON CONFLICT DO NOTHING
  const result = await db.slugs.insertMany(slugs, { ignoreConflicts: true });
  return result.insertedCount; // Return actual rows inserted
});
```

## Environment Support

`@mgamil/slug-generator` is designed to be environment-agnostic, running seamlessly in Node.js, modern browsers, Edge functions, and serverless environments:
* **Modern Browsers & Edge Runtimes**: Uses the native Web Crypto API (`globalThis.crypto.getRandomValues`) for cryptographically secure random slug generation.
* **Node.js**: Automatically resolves the Node.js built-in `crypto` module as a secure random generator when `globalThis.crypto` is unavailable.
* **Graceful Fallback**: If neither Web Crypto nor Node `crypto` is present in the runtime environment, the library automatically falls back to generating pseudo-random bytes via `Math.random` and logs a one-time console warning.

## Documentation

For full details on options, signatures, validation exceptions, and edge-cases, please refer to the [API documentation](docs/api.md).

## License

Apache-2.0
