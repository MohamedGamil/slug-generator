# API Reference - @mgamil/slug-generator

This document contains a detailed specification of the types, functions, configuration limits, and exception rules in the `@mgamil/slug-generator` package.

---

## Functions

### `generateSlug(options?: GenerateSlugOptions): string`
Generates a cryptographically secure random slug.

#### Options (`GenerateSlugOptions`)
All options are optional:
* **`length`** (`number`): The target length of the generated slug. Defaults to `8`.
* **`alphabet`** (`string`): The set of allowed characters for the slug. Defaults to a standard alphanumeric-hyphen-underscore set: `A-Z`, `a-z`, `0-9`, `-`, `_`.
* **`minLength`** (`number`): Configures the minimum allowable generated length limit. Defaults to `5`. Must be an integer >= 2.
* **`maxLength`** (`number`): Configures the maximum allowable generated length limit. Defaults to `64`. Must be an integer <= 64.

#### Exceptions
Throws an `Error` if:
* `alphabet` is not a string or is empty.
* `length`, `minLength`, or `maxLength` are not integers.
* Configured `minLength` is less than `2`.
* Configured `maxLength` exceeds `64`.
* Configured `minLength` is greater than `maxLength`.
* Requested `length` is outside the range defined by `[minLength, maxLength]`.

---

### `toSlug(text: string, options?: ToSlugOptions): string`
Sanitizes arbitrary UTF-8 text into a URL-friendly slug. Alias: `slugify`.

#### Options (`ToSlugOptions`)
All options are optional:
* **`preserveCase`** (`boolean`): If `true`, preserves the original case of characters. If `false` (default), lowercases all characters.
* **`preserveSpace`** (`boolean`): If `true`, preserves spaces (replacing them with the separator). If `false` (default), strips all whitespace characters from the string completely.
* **`minLength`** (`number`): Configures the minimum allowable sanitized length. Defaults to `1`. Must be an integer >= 1.
* **`maxLength`** (`number`): Configures the maximum allowable sanitized length. Defaults to `128`. Must be an integer <= 128.
* **`separator`** (`string`): The character or string used to replace spaces/special characters when `preserveSpace` is `true`. Defaults to `'-'`.

#### Exception/Trimming Flow
1. Normalizes the string decomposes accents (e.g., `é` -> `e`).
2. Converts string to lowercase (if `preserveCase` is not `true`).
3. Strips all whitespace characters (if `preserveSpace` is not `true`).
4. Replaces any non-alphanumeric, non-hyphen, non-underscore, and non-space characters with an empty string.
5. Replaces combinations of spacing/dashes/underscores with the `separator`.
6. Trims leading and trailing occurrences of the `separator` (handles multi-character separators correctly).
7. If the length exceeds `maxLength`, slices the string to `maxLength` and re-trims trailing separators.
8. Throws an `Error` if the final slug length is less than `minLength`.

#### Exceptions
Throws an `Error` if:
* `text` is not a string.
* `minLength` or `maxLength` are not integers.
* Configured `minLength` is less than `1`.
* Configured `maxLength` exceeds `128`.
* Configured `minLength` is greater than `maxLength`.
* The final sanitized slug is shorter than `minLength` (e.g., if input text has only accents/emojis and spaces).

---

## Examples

### Custom Validation Limits for Random Slugs
```typescript
import { generateSlug } from '@mgamil/slug-generator';

// This configuration extends bounds down to 3 characters
const shortSlug = generateSlug({
  length: 3,
  minLength: 2,
  maxLength: 10
});
console.log(shortSlug); // e.g. "a3_"
```

### Multi-Character Separators in Sanitization
```typescript
import { toSlug } from '@mgamil/slug-generator';

const slug = toSlug('abcabc Hello World abc', {
  separator: 'abc',
  preserveSpace: true
});
// Leading/trailing 'abc' instances are trimmed out completely
console.log(slug); // "helloabcyourabcworld"
```

### Edge Case String Sanitization
```typescript
import { toSlug } from '@mgamil/slug-generator';

// Accents are decomposed, emoji is stripped, default preserveSpace = false
const slug = toSlug('Café ☕️ Time');
console.log(slug); // "cafetime"

// Accents decomposed, emoji stripped, preserveSpace = true
const slugWithSpace = toSlug('Café ☕️ Time', { preserveSpace: true });
console.log(slugWithSpace); // "cafe-time"
```
