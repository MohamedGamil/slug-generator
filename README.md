# Slug Generator

A powerful, light-weight, zero-dependency utility package for generating random cryptographically secure slugs and sanitizing arbitrary UTF-8 text into URL-safe formats with configurable constraints.

## Features

- **Secure Slug Generation**: Create cryptographically secure random identifier strings using a bias-free selection algorithm.
- **Unique Slug Generation**: Generate unique slugs asynchronously using a customizable uniqueness validation callback.
- **Prefix, Suffix & Separators**: Configure prefix, suffix, and custom separators for generated random slugs.
- **Unicode-safe Text Sanitization**: Normalize and convert arbitrary strings into URL-safe slugs with accented characters properly handled.
- **Preserve Unicode**: Option to keep non-ASCII Unicode letters and numbers in the sanitized slug.
- **Phonetic Transliteration**: Convert non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew, Japanese Hiragana/Katakana, common Chinese Hanzi, and common Korean Hangul) to their phonetic spoken ASCII equivalents.
- **Casing Controls**: Toggle lowercase, uppercase, or preserve casing.
- **Regex & String Allowed Characters**: Pass custom allowed characters via literal strings or regular expressions.
- **Output Control Options**: Manage fallback values for empty results, disable separator/space trimming, and configure consecutive separator collapsing.
- **Strict Configuration Boundaries**: Robust checks against invalid settings, floating-point parameters, and non-URL-safe parameters.
- **Modern Module Resolution**: Fully supports ESM imports and typed exports natively.

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

### 2. Generating Unique Slugs

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

// Fallback for empty results
const emptySlug = toSlug('!!!@@@', { fallback: 'untitled' });
console.log(emptySlug); // "untitled"
```

## Documentation

For full details on options, signatures, validation exceptions, and edge-cases, please refer to the [API documentation](docs/api.md).

## License

Apache-2.0
