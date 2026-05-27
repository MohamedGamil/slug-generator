# Changelog

All notable changes to the `@mgamil/slug-generator` package will be documented in this file.

## [1.5.1] - 2026-05-27

### Fixed
- Resolved CommonJS loader error `ERR_REQUIRE_ASYNC_MODULE` by eliminating top-level `await` statement from `random.ts`.
- Implemented a top-level-await-free runtime check for cryptographic random bytes, safely resolving to Web Crypto API (`globalThis.crypto.getRandomValues`) or Node's native `require('crypto')` synchronously.

---

## [1.5.0] - 2026-05-27

### Added
- Shorthand functional helpers for easy, easy-to-remember access to new unique slug features:
  - `uuidv4()`: Shorthand for standard UUIDv4 string generation.
  - `uuidv6()`: Shorthand for time-ordered sortable UUIDv6 string generation.
  - `uuidSlug(uuid)`: Shorthand for compacting standard UUIDs into 22-char URL slugs.
  - `snowflake(options)`: Shorthand for Snowflake decimal string generation.
  - `snowflakeSlug(options)`: Shorthand for Snowflake Base64 URL-safe slug generation.
  - `obfuscate(counter, options)`: Shorthand for scrambled Knuth-based sequence counter slug generation.
  - `obfuscateDecode(slug, options)`: Shorthand for reversing obfuscated slugs back to counter values.
  - `createSlugBatch(count, options)`: Shorthand for generating a batch of unique slugs in memory.
- Added `decode(slug)` method to `ObfuscatedSequenceSlugGenerator` to reverse the modular multiplicative hashing and recover the original sequence counter.
- Documented all source files, classes, constructors, methods, and constants with detailed JSDoc comments.
- Expanded unit test coverage in `src/unique.spec.ts` to cover error boundaries, constraint parameters, and new shorthand helpers.

---

## [1.4.0] - 2026-05-27

### Refactored
- Extracted repeated constants (`DEFAULT_ALPHABET`, `URL_SAFE_CHARACTERS`) and Base64 URL-safe encoding/decoding utilities into an isolated `src/utils.ts` module.
- Isolated all configuration and options interfaces (`GenerateSlugOptions`, `ToSlugOptions`, `GenerateUniqueSlugOptions`, `SnowflakeOptions`, `ObfuscatedSequenceOptions`) into `src/types.ts`.
- Cleaned up imports and eliminated redundant implementations across all core, generator, and structure modules.

### Added
- Unit tests for the new isolated Base64 URL conversion utilities in `src/utils.spec.ts`.

---

## [1.3.0] - 2026-05-26

### Added
- Environment-agnostic random generation supporting browsers and serverless runtimes natively via Web Crypto API (`globalThis.crypto.getRandomValues`) and Node's `'crypto'` module as a fallback. Node.js is now fully optional.
- Multi-layer entropy mixing (`mixEntropy`) that salts random bytes using high-resolution time, process state, and sequence counters to guarantee randomness integrity and minimize collisions in fallback environments.
- Added collision tests confirming **zero duplicates** across **1 million generated 7-character Base64 slugs**, out of ~621.2 million possible combinations.

---

## [1.2.0] - 2026-05-26

### Added
- Flexible `options` parameter in `generateSlug(options)` supporting either a direct `number` (to set slug length) or a config object.
- Modulo bias elimination in random slug generation using cryptographic rejection sampling.
- Options `prefix`, `suffix`, and `separator` for random secure slug generation.
- New asynchronous function `generateUniqueSlug(options)` with a required `exists` uniqueness check callback.
- New options for `toSlug` / `slugify`:
  - `lowercase` and `uppercase` for casing conversion.
  - `preserveUnicode` to preserve non-ASCII letters and numbers in the slug.
  - `transliterate` toggle to enable/disable phonetic transliteration.
  - RegExp and string support for `allowedChars` custom allowed characters.
  - `fallback` string to return on empty or too-short results.
  - `trim` and `collapseSeparators` toggles.

### Fixed
- Fixed redundant console debug logs in `generateSlug` and `toSlug`.
- Enhanced validation checks and regex range parsing.

---

## [1.1.0] - 2026-05-26

### Added
- Zero-dependency phonetic transliteration (romanization) support for major non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew, Japanese Hiragana/Katakana, common Chinese Hanzi, and common Korean Hangul) in `toSlug` to cleanly convert non-Latin inputs into phonetic URL-safe slugs.
- New `toSlug` and `slugify` (alias) utility functions to convert any arbitrary UTF-8 text into a URL-safe slug.
- Option `preserveSpace` (defaults to `false` to replace spaces with the separator character, or set to `true` to leave space characters intact in the sanitized slug).
- Option `preserveCase` in `toSlug` (defaults to `false` to lowercase the slug).
- Option `allowedCharacters` in `toSlug` to allow custom characters (must be a subset of URL-safe characters: `a-zA-Z0-9-_.~`).
- Configurable minimum/maximum length constraints in `toSlug` (minimum >= 1, maximum <= 128).
- Modern package exports configuration in `package.json` for ESM support and type declarations mapping.

### Changed
- Refactored `generateSlug` to support configurable minimum and maximum length bounds (minimum >= 2, maximum <= 64).
- Constrained `separator` option to only accept a single, URL-safe character (min/max length of 1), throwing a validation error on invalid configuration.

### Fixed
- Added robust input validation (checks for integers, empty alphabets, non-string inputs, invalid separators/custom characters, and null options).
- Improved separator and space trimming logic to cleanly slice and format the resulting slugs.

---

## [1.0.0] - 2026-05-25

### Added
- Initial implementation of `@mgamil/slug-generator` supporting random cryptographically secure slug generation.
- Default length of 8, customizable between 5 and 64 characters.
- Custom alphabets and Vitest suite configuration.
