# @mgamil/slug-generator

A powerful, light-weight utility package for generating random cryptographically secure slugs and sanitizing arbitrary UTF-8 text into URL-safe formats with configurable constraints.

## Features

- **Secure Slug Generation**: Create cryptographically secure random identifier strings using configurable character sets.
- **Unicode-safe Text Sanitization**: Normalize and convert arbitrary strings into URL-safe slugs with accented characters properly decomposed.
- **Phonetic Transliteration**: Convert non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew, Japanese Hiragana/Katakana, common Chinese Hanzi, and common Korean Hangul) to their phonetic spoken ASCII equivalents, avoiding empty slugs or validation exceptions for non-Latin inputs.
- **Configurable Casing**: Convert to lowercase by default, or preserve the original casing options.
- **Configurable Spacing**: Replace spaces with the separator by default (`preserveSpace: false`), or leave space characters intact in the sanitized slug (`preserveSpace: true`).
- **Custom Separators**: Use a custom single-character URL-safe separator (e.g. `'_'`, defaults to `'-'`).
- **Strict Configuration Boundaries**: Robust checks against floating-point values and invalid limits configuration.
- **Modern Module Resolution**: Fully supports ESM imports and typed exports natively.

## Installation

Within the monorepo or standard NPM projects:

```bash
pnpm add @mgamil/slug-generator
# or
npm install @mgamil/slug-generator
```

## Quick Start

### 1. Generating Random Slugs

```typescript
import { generateSlug } from '@mgamil/slug-generator';

// Generates a random secure slug (default length: 8)
const randomId = generateSlug();
console.log(randomId); // e.g. "aX9_z-pL"

// Custom length and limits
const customId = generateSlug({
  length: 12,
  minLength: 8,
  maxLength: 16
});
```

### 2. Sanitizing Text to Slugs

```typescript
import { toSlug, slugify } from '@mgamil/slug-generator';

// Standard sanitization (spaces replaced by separator by default)
const slug = toSlug('Hello World! 🌟');
console.log(slug); // "hello-world"

// Preserving space characters intact
const slugWithSpaces = toSlug('Hello World!', { preserveSpace: true });
console.log(slugWithSpaces); // "hello world"

// Custom separators & preserved casing
const camelSlug = slugify('Hello World!', {
  preserveCase: true,
  preserveSpace: false,
  separator: '_'
});
console.log(camelSlug); // "Hello_World"

// Phonetic Transliteration of non-Latin scripts (Arabic, Hebrew, Cyrillic, Chinese, etc.)
const nonLatinSlug = toSlug('مرحبا hello שָׁלוֹם');
console.log(nonLatinSlug); // "mrhba-hello-shalom"
```

## Documentation

For full details on options, signatures, validation exceptions, and edge-cases, please refer to the [API documentation](docs/api.md).

## License

Apache-2.0

