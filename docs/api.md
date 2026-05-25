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
* **`preserveSpace`** (`boolean`): If `true`, spaces are preserved as space characters `" "` (consecutive spaces collapsed, leading/trailing trimmed). If `false` (default), all spaces are replaced by the `separator` character.
* **`minLength`** (`number`): Configures the minimum allowable sanitized length. Defaults to `1`. Must be an integer >= 1.
* **`maxLength`** (`number`): Configures the maximum allowable sanitized length. Defaults to `128`. Must be an integer <= 128.
* **`separator`** (`string`): A single custom character used to replace spaces when `preserveSpace` is `false` (or other whitespace/hyphens/underscores when `preserveSpace` is `true`). Defaults to `'-'`. Must be exactly 1 character long and must be a URL-safe character (`a-zA-Z0-9-_.~`).
* **`allowedCharacters`** (`string`): A string containing custom characters that are allowed to remain in the sanitized slug. Only characters from the predefined URL-safe set (`a-zA-Z0-9-_.~`) are allowed.

#### Exception/Trimming Flow
1. Validates options parameters and throws immediate exceptions if `text` is not a string, or if configured bounds/types (`minLength`, `maxLength`, `separator`, `allowedCharacters`) are invalid or not URL-safe.
2. Identifies if the input contains non-ASCII characters and transliterates supported non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew, Japanese Hiragana/Katakana, common Chinese Hanzi, and common Korean Hangul syllables) into their phonetic ASCII equivalents.
3. Normalizes the string and decomposes accents (e.g., `é` -> `e`).
4. Converts the string to lowercase (unless `preserveCase` is set to `true`).
5. Strips any character from the text that is not alphanumeric, a space, hyphen, underscore, or in `allowedCharacters`.
6. Handles spacing:
   - If `preserveSpace` is `true`: replaces tabs/newlines/hyphens/underscores with `separator`, then collapses consecutive spaces.
   - If `preserveSpace` is `false` (default): replaces all spaces/whitespace/hyphens/underscores with `separator`.
7. Trims leading and trailing occurrences of the `separator` and space characters (if `preserveSpace` is `true`).
8. If the length exceeds `maxLength`, slices the string to `maxLength` and re-trims trailing separators/spaces.
9. Throws an `Error` if the final slug length is less than `minLength`.

#### Exceptions
Throws an `Error` if:
* `text` is not a string.
* `minLength` or `maxLength` are not integers.
* Configured `minLength` is less than `1`.
* Configured `maxLength` exceeds `128`.
* Configured `minLength` is greater than `maxLength`.
* `separator` is specified but is not a string of length exactly 1.
* `separator` is specified but is not a URL-safe character (`a-zA-Z0-9-_.~`).
* `allowedCharacters` is specified but is not a string.
* Any character in `allowedCharacters` is not URL-safe (`a-zA-Z0-9-_.~`).
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

### Custom Allowed Characters in Sanitization
```typescript
import { toSlug } from '@mgamil/slug-generator';

// Allow dot and tilde in the output slug
const slug = toSlug('hello.world~', {
  allowedCharacters: '.~'
});
console.log(slug); // "hello-world~" (space replaced by default separator '-', dot/tilde preserved)
```

### Space Preservation in Sanitization
```typescript
import { toSlug } from '@mgamil/slug-generator';

// Default preserveSpace = false: spaces replaced by separator '-'
const slug = toSlug('Café ☕️ Time');
console.log(slug); // "cafe-time"

// preserveSpace = true: spaces left as actual space characters
const slugWithSpace = toSlug('Café ☕️ Time', { preserveSpace: true });
console.log(slugWithSpace); // "cafe time"
```

### Phonetic Transliteration of non-Latin Scripts
```typescript
import { toSlug } from '@mgamil/slug-generator';

// Cyrillic script
console.log(toSlug('привет')); // "privet"

// Arabic script
console.log(toSlug('مرحبا')); // "mrhba"

// Chinese Hanzi
console.log(toSlug('你好')); // "nihao"

// Japanese Hiragana
console.log(toSlug('こんにちは')); // "konnichiha"

// Korean Hangul syllables
console.log(toSlug('안녕하세요')); // "annyeonghaseyo"
```

