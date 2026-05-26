# API Reference - Slug Generator

This document contains a detailed specification of the classes, types, functions, configuration limits, and exception rules in the `@mgamil/slug-generator` package.

---

## Configuration Interfaces (`src/types.ts`)

### `GenerateSlugOptions`
Options for random slug generation:
* **`length`** (`number`): Target length of the random part. Defaults to `8`.
* **`alphabet`** (`string`): Set of allowed characters. Defaults to standard base64 url-safe character set.
* **`minLength`** (`number`): Minimum allowable random length limit configuration. Defaults to `5`. Must be >= 2.
* **`maxLength`** (`number`): Maximum allowable random length limit configuration. Defaults to `64`. Must be <= 64.
* **`prefix`** (`string`): Fixed prefix to prepend.
* **`suffix`** (`string`): Fixed suffix to append.
* **`separator`** (`string`): Character joining prefix/suffix with random part. Must be exactly 1 character and URL-safe.

### `ToSlugOptions`
Options for text sanitization / slugification:
* **`preserveCase`** (`boolean`): If `true`, keeps original case.
* **`lowercase`** (`boolean`): If `true`, outputs lowercase (default).
* **`uppercase`** (`boolean`): If `true`, outputs uppercase.
* **`preserveSpace`** (`boolean`): If `true`, spaces remain literal space characters `" "`.
* **`preserveUnicode`** (`boolean`): If `true`, bypasses accent decomposition and phonetic transliteration, retaining Unicode letters/numbers.
* **`transliterate`** (`boolean`): If `true` (default), phonetic transliteration of major scripts is enabled.
* **`minLength`** (`number`): Minimum allowed sanitized length. Defaults to `1`. Must be >= 1.
* **`maxLength`** (`number`): Maximum allowed sanitized length. Defaults to `128`. Must be <= 128.
* **`separator`** (`string`): Replacer for space and non-allowed characters. Defaults to `'-'`. Must be exactly 1 character and URL-safe.
* **`allowedCharacters`** (`string`): Set of extra URL-safe characters to preserve.
* **`allowedChars`** (`RegExp | string`): Alias of `allowedCharacters`, supporting regular expressions.
* **`fallback`** (`string`): Fallback return value if output is empty. If set to `"%AUTO%"`, it generates a random 8-character secure slug.
* **`trim`** (`boolean`): If `true` (default), trims leading and trailing separators.
* **`collapseSeparators`** (`boolean`): If `true` (default), collapses consecutive separators.

### `GenerateUniqueSlugOptions`
Extends `GenerateSlugOptions` with:
* **`exists`** (`(slug: string) => boolean | Promise<boolean>`): **[Required]** Callback returning `true` if slug is taken.
* **`maxRetries`** (`number`): Maximum checks before throwing. Defaults to `100`.

### `SnowflakeOptions`
Options for Snowflake ID generation:
* **`epoch`** (`number | bigint`): Custom epoch timestamp in milliseconds. Defaults to January 1, 2026 (`1767225600000n`).
* **`workerId`** (`number | bigint`): Machine/worker identifier (0-1023). Defaults to `0`.

### `ObfuscatedSequenceOptions`
Options for bijective scrambled counter slug generator:
* **`alphabet`** (`string`): Custom alphabet for base encoding.
* **`minLength`** (`number`): Minimum padded output length. Defaults to `6`.
* **`multiplier`** (`bigint`): Knuth's co-prime multiplier. Defaults to `2654435761n`.
* **`modulo`** (`bigint`): Divisor for range mapping. Defaults to `4294967296n` ($2^{32}$).

---

## Classes & Services

### `RandomSlugGenerator` (`src/core/random.ts`)
* **`static generate(options?: GenerateSlugOptions | number): string`**
  Generates a cryptographically secure random slug. Modulo bias is avoided using rejection sampling.
* **`static generateBatch(count: number, options?: GenerateSlugOptions | number): string[]`**
  Generates a batch of secure random slugs. Pre-allocates single combined byte buffers internally to maximize throughput and minimize sys-call overhead.

### `TextSlugifier` (`src/core/sanitize.ts`)
* **`static sanitize(text: string, options?: ToSlugOptions): string`**
  Sanitizes arbitrary UTF-8 text into a URL-friendly slug according to options. Handles script transliterations and casing rules.

### `UniqueSlugService` (`src/core/unique.ts`)
* **`static generate(options: GenerateUniqueSlugOptions): Promise<string>`**
  Asynchronously generates a unique secure random slug by evaluating the `exists` callback in retry loop.

### `UuidSlugGenerator` (`src/generators/uuid.ts`)
* **`static v4(): string`**
  Generates standard RFC 4122 random UUIDv4.
* **`static v6(): string`**
  Generates time-ordered sortable UUIDv6. Features randomized clock sequences and multicast node identifiers generated once per lifecycle.
* **`static slugify(uuid: string): string`**
  Compacts standard 36-char UUID string into 22-char Base64 URL-safe slug.

### `SnowflakeSlugGenerator` (`src/generators/snowflake.ts`)
* **`constructor(options?: SnowflakeOptions)`**
  Initializes generator with custom epoch and worker ID.
* **`generate(): bigint`**
  Generates raw 64-bit Snowflake ID (timestamp offset + worker + sequence rollover).
* **`generateString(): string`**
  Generates Snowflake ID formatted as decimal string.
* **`generateSlug(): string`**
  Generates compact base64-encoded URL-safe slug representation of the Snowflake ID.

### `BloomFilter` (`src/structures/bloom.ts`)
* **`constructor(expectedCapacity: number, falsePositiveRate?: number)`**
  Computes mathematically optimal size and hash count for filter bits array.
* **`add(item: string): void`**
  Inserts item into filter using MurmurHash3.
* **`mightContain(item: string): boolean`**
  Probabilistic membership check. Returns `false` if item is guaranteed unique (not in set).
* **`export(): string`**
  Serializes internal bit array to Base64 URL-safe string.
* **`static import(serialized: string, expectedCapacity: number, falsePositiveRate?: number): BloomFilter`**
  Reconstructs a Bloom Filter from a serialized base64 string.

### `SlugPoolGenerator` (`src/structures/pool.ts`)
* **`static generateUniqueBatch(count: number, options?: GenerateSlugOptions | number): string[]`**
  Generates a batch of random slugs, guaranteeing absolute uniqueness *within* the returned array.
* **`static fillDbPool(count: number, insertFn: (slugs: string[]) => Promise<number>, options?: GenerateSlugOptions | number): Promise<number>`**
  Seeds external pools/databases. Executes batches and monitors returns from `insertFn` (which handles database conflict resolution) until target count is fully populated.

### `ObfuscatedSequenceSlugGenerator` (`src/structures/pool.ts`)
* **`constructor(options?: ObfuscatedSequenceOptions)`**
  Initializes parameters and co-prime constants.
* **`generate(counter: number | bigint): string`**
  Bijectively scrambles sequence counter to produce guaranteed unique and non-guessable URL slug.
* **`decode(slug: string): bigint`**
  Reverses the scrambled slug back to its original sequential counter value. Throws an error if the slug is invalid or contains characters not in the configured alphabet.

---

## Shorthand Functional Helpers (`src/helpers.ts`)

* **`uuidv4(): string`**
  Generates a standard random UUIDv4 string.
* **`uuidv6(): string`**
  Generates a time-ordered UUIDv6 string.
* **`uuidSlug(uuid: string): string`**
  Compacts standard 36-character UUID string into 22-character URL-safe Base64 slug.
* **`snowflake(options?: SnowflakeOptions): string`**
  Generates decimal string Snowflake ID.
* **`snowflakeSlug(options?: SnowflakeOptions): string`**
  Generates compact base64 URL-safe slug representation of Snowflake ID.
* **`obfuscate(counter: number | bigint, options?: ObfuscatedSequenceOptions): string`**
  Maps sequential counter bijectively to unique scrambled URL slug.
* **`obfuscateDecode(slug: string, options?: ObfuscatedSequenceOptions): bigint`**
  Reverses an obfuscated slug back to its original counter value.
* **`createSlugBatch(count: number, options?: GenerateSlugOptions | number): string[]`**
  Generates batch of unique random slugs in memory.

---

## isolated Utility Functions (`src/utils.ts`)

* **`bytesToBase64Url(bytes: Uint8Array): string`**
  Encodes a byte array into a URL-safe Base64 string without padding.
* **`base64UrlToBytes(str: string): Uint8Array`**
  Decodes a URL-safe Base64 string without padding back into a Uint8Array.

---

## Environment Support & Shims

The package dynamically selects the best available cryptographically secure random number source:
1. **Web Crypto API**: `globalThis.crypto.getRandomValues` used if available (modern browsers, Deno, Bun, Cloudflare Workers, Node.js >= 19).
2. **Node.js Crypto Module**: Dynamically imported `crypto` as fallback for traditional Node setups.
3. **Graceful Fallback**: Math.random pseudorandom bytes salted with process/time entropy (`mixEntropy`) as safety shim if no secure random source is found.
