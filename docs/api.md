# API Reference - Slug Generator

This document contains a detailed specification of the types, functions, configuration limits, and exception rules in the `@mgamil/slug-generator` package.

---

## Functions

### `generateSlug(options?: GenerateSlugOptions | number): string`
Generates a cryptographically secure random slug using a bias-free selection algorithm.

If `options` is a `number`, it is treated as the configuration for the target `length` of the generated slug (with defaults applied for other options).

#### Options (`GenerateSlugOptions`)
All options are optional:
* **`length`** (`number`): The target length of the generated random part. Defaults to `8`.
* **`alphabet`** (`string`): The set of allowed characters for the random part. Defaults to a standard alphanumeric-hyphen-underscore set: `A-Z`, `a-z`, `0-9`, `-`, `_`.
* **`minLength`** (`number`): Configures the minimum allowable generated random length limit. Defaults to `5`. Must be an integer >= 2.
* **`maxLength`** (`number`): Configures the maximum allowable generated random length limit. Defaults to `64`. Must be an integer <= 64.
* **`prefix`** (`string`): An optional fixed prefix prepended to the generated slug.
* **`suffix`** (`string`): An optional fixed suffix appended to the generated slug.
* **`separator`** (`string`): Separator character between the prefix/suffix and the random part. Defaults to no separator. Must be exactly 1 character and belong to `a-zA-Z0-9-_.~`.

#### Exceptions
Throws an `Error` if:
* `alphabet` is not a string or is empty.
* `length`, `minLength`, or `maxLength` are not integers.
* Configured `minLength` is less than `2`.
* Configured `maxLength` exceeds `64`.
* Configured `minLength` is greater than `maxLength`.
* Requested `length` is outside the range defined by `[minLength, maxLength]`.
* `prefix` or `suffix` is specified but is not a string, or contains characters that are not URL-safe.
* `separator` is specified but is not exactly 1 character or is not URL-safe.

---

### `generateUniqueSlug(options: GenerateUniqueSlugOptions): Promise<string>`
Generates a unique cryptographically secure random slug. It iteratively calls `generateSlug` and checks uniqueness using a custom callback.

#### Options (`GenerateUniqueSlugOptions`)
Extends `GenerateSlugOptions` and adds:
* **`exists`** (`(slug: string) => boolean | Promise<boolean>`): **[Required]** Callback function that resolves to `true` if the slug is already taken (exists) and `false` if it is unique.
* **`maxRetries`** (`number`): Maximum number of attempts to generate a unique slug before throwing an error. Defaults to `100`. Must be a positive integer.

#### Exceptions
Throws an `Error` if:
* Options object is missing.
* `exists` callback is missing or is not a function.
* `maxRetries` is not a positive integer.
* A unique slug cannot be generated after `maxRetries` attempts.
* Any parameters fail `generateSlug` validation.

---

### `toSlug(text: string, options?: ToSlugOptions): string`
Sanitized arbitrary UTF-8 text into a URL-friendly slug. Alias: `slugify`.

#### Options (`ToSlugOptions`)
All options are optional:
* **`preserveCase`** (`boolean`): If `true`, preserves the original case of characters.
* **`lowercase`** (`boolean`): If `true`, converts the output to lowercase (default behavior if casing options are unspecified).
* **`uppercase`** (`boolean`): If `true`, converts the output to uppercase.
* **`preserveSpace`** (`boolean`): If `true`, spaces are preserved as space characters `" "` (consecutive spaces collapsed, leading/trailing trimmed). If `false` (default), all spaces are replaced by the `separator` character.
* **`preserveUnicode`** (`boolean`): If `true`, preserves non-ASCII Unicode letters and numbers in the output. Skips phonetic transliteration and accent decomposition.
* **`transliterate`** (`boolean`): If `true` (default), automatically converts non-Latin scripts (Cyrillic, Arabic, Hebrew, Chinese, Japanese, Korean, Greek) to ASCII phonetic equivalents.
* **`minLength`** (`number`): Configures the minimum allowable sanitized length. Defaults to `1`. Must be an integer >= 1.
* **`maxLength`** (`number`): Configures the maximum allowable sanitized length. Defaults to `128`. Must be an integer <= 128.
* **`separator`** (`string`): A single custom character used to replace spaces when `preserveSpace` is `false`. Defaults to `'-'`. Must be exactly 1 character long and must be a URL-safe character (`a-zA-Z0-9-_.~`).
* **`allowedCharacters`** (`string`): A string containing custom characters allowed to remain in the sanitized slug. Only characters from the predefined URL-safe set (`a-zA-Z0-9-_.~`) are allowed.
* **`allowedChars`** (`RegExp | string`): Superset/alias of `allowedCharacters`. Accepts a string of allowed characters, or a regular expression representing custom allowed characters.
* **`fallback`** (`string`): A fallback string value returned if the sanitized slug is empty or shorter than `minLength` (e.g. if input contains only stripped emojis/symbols).
* **`trim`** (`boolean`): If `true` (default), trims leading and trailing separators and spaces.
* **`collapseSeparators`** (`boolean`): If `true` (default), collapses multiple consecutive separators.

#### Exception/Trimming Flow
1. Validates options parameters and throws immediate exceptions if bounds, types, or separators are invalid.
2. If `lowercase` and `uppercase` are both set to `true`, throws a casing conflict exception.
3. Transliterates supported non-Latin scripts to phonetic ASCII equivalents (unless `transliterate` is set to `false` or `preserveUnicode` is `true`).
4. Performs Unicode normalization:
   - NFC normalization if `preserveUnicode` is `true`.
   - NFD normalization + accent stripping if `preserveUnicode` is `false`.
5. Adjusts casing based on `preserveCase`, `lowercase`, and `uppercase` settings.
6. Filters characters keeping only alphanumeric (ASCII-only or Unicode depending on `preserveUnicode`), spaces, hyphens, underscores, and characters matching `allowedChars`/`allowedCharacters`.
7. Replaces whitespace/hyphens/underscores with `separator` (unless `preserveSpace` is `true`). Collapses consecutive separators if `collapseSeparators` is `true`.
8. Trims leading/trailing separators and spaces (unless `trim` is `false`).
9. Truncates to `maxLength`.
10. Checks `minLength`. If too short, returns `fallback` if provided; otherwise, throws an `Error`.

---

## Examples

### Generating Unique Slugs in Database
```typescript
import { generateUniqueSlug } from '@mgamil/slug-generator';

const slug = await generateUniqueSlug({
  length: 12,
  exists: async (newSlug) => {
    const count = await db.users.count({ where: { referralSlug: newSlug } });
    return count > 0;
  }
});
```

### Prefix, Suffix, and Separator for Random Slugs
```typescript
import { generateSlug } from '@mgamil/slug-generator';

const code = generateSlug({
  length: 6,
  prefix: 'REF',
  suffix: '2026',
  separator: '_'
});
console.log(code); // e.g. "REF_aK92mz_2026"
```

### Preserving Unicode Characters
```typescript
import { toSlug } from '@mgamil/slug-generator';

const slug = toSlug('Café au lait & مرحبا', { preserveUnicode: true });
console.log(slug); // "café-au-lait-مرحبا"
```

### Regular Expression Allowed Characters
```typescript
import { toSlug } from '@mgamil/slug-generator';

const slug = toSlug('v1.0.0-beta.2', { allowedChars: /[.]/ });
console.log(slug); // "v1.0.0-beta.2"
```
