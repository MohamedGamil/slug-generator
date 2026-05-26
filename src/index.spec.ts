import { describe, it, expect } from 'vitest';
import { generateSlug, toSlug, slugify, generateUniqueSlug } from './index';

describe('slug-generator', () => {
  it('should generate a slug with default length 8', () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(8);
  });

  it('should generate a slug with custom length options', () => {
    const slug = generateSlug({ length: 12 });
    expect(slug).toHaveLength(12);
  });

  it('should generate a slug when passed a number as options', () => {
    const slug1 = generateSlug(10);
    expect(slug1).toHaveLength(10);

    const slug2 = generateSlug(6);
    expect(slug2).toHaveLength(6);

    expect(() => generateSlug(4)).toThrow('Slug length must be between 5 and 64 characters.');
    expect(() => generateSlug(65)).toThrow('Slug length must be between 5 and 64 characters.');
  });

  it('should only use characters from the specified alphabet', () => {
    const customAlphabet = 'ABC';
    const slug = generateSlug({ length: 20, alphabet: customAlphabet });
    for (const char of slug) {
      expect(customAlphabet).toContain(char);
    }
  });

  it('should throw error for length < 5 by default', () => {
    expect(() => generateSlug({ length: 4 })).toThrow();
  });

  it('should throw error for length > 64 by default', () => {
    expect(() => generateSlug({ length: 65 })).toThrow();
  });

  it('should allow configurable minLength down to 2', () => {
    const slug = generateSlug({ length: 2, minLength: 2 });
    expect(slug).toHaveLength(2);
  });

  it('should throw error if configurable minLength is less than 2', () => {
    expect(() => generateSlug({ length: 5, minLength: 1 })).toThrow('Minimum slug length configuration cannot be less than 2.');
  });

  it('should throw error if configurable maxLength exceeds 64', () => {
    expect(() => generateSlug({ length: 5, maxLength: 65 })).toThrow('Maximum slug length configuration cannot exceed 64.');
  });

  it('should throw error if minLength > maxLength', () => {
    expect(() => generateSlug({ length: 5, minLength: 10, maxLength: 8 })).toThrow('Minimum slug length cannot be greater than maximum slug length.');
  });

  it('should throw error if length is below configurable minLength', () => {
    expect(() => generateSlug({ length: 3, minLength: 4 })).toThrow('Slug length must be between 4 and 64 characters.');
  });

  it('should throw error if length is above configurable maxLength', () => {
    expect(() => generateSlug({ length: 20, maxLength: 15 })).toThrow('Slug length must be between 5 and 15 characters.');
  });

  it('should throw error if alphabet is empty', () => {
    expect(() => generateSlug({ alphabet: '' })).toThrow('Alphabet option must be a non-empty string.');
  });

  it('should throw error if length parameters are not integers', () => {
    expect(() => generateSlug({ length: 5.5 })).toThrow('Length must be an integer.');
    expect(() => generateSlug({ minLength: 3.5 })).toThrow('Minimum slug length configuration must be an integer.');
    expect(() => generateSlug({ maxLength: 10.5 })).toThrow('Maximum slug length configuration must be an integer.');
  });

  it('should handle null or undefined options gracefully', () => {
    expect(generateSlug(null as any)).toBeDefined();
    expect(generateSlug(undefined)).toBeDefined();
  });

  it('should verify low collision probability', () => {
    const set = new Set<string>();
    const count = 10000;
    for (let i = 0; i < count; i++) {
      set.add(generateSlug({ length: 10 }));
    }
    expect(set.size).toBe(count); // No duplicates in 10k generations
  });

  describe('toSlug and slugify', () => {
    it('should throw error if input text is not a string', () => {
      expect(() => toSlug(null as any)).toThrow('Input text must be a string.');
      expect(() => toSlug(undefined as any)).toThrow('Input text must be a string.');
      expect(() => toSlug(123 as any)).toThrow('Input text must be a string.');
    });

    it('should throw error if limits are not integers', () => {
      expect(() => toSlug('text', { minLength: 2.5 })).toThrow('Minimum slug length configuration must be an integer.');
      expect(() => toSlug('text', { maxLength: 10.5 })).toThrow('Maximum slug length configuration must be an integer.');
    });

    it('should handle null or undefined options gracefully', () => {
      expect(toSlug('Hello World', null as any)).toBe('hello-world');
      expect(toSlug('Hello World', undefined)).toBe('hello-world');
    });

    it('should throw error if separator option is invalid', () => {
      expect(() => toSlug('text', { separator: 'abc' })).toThrow('Separator must be exactly 1 character long.');
      expect(() => toSlug('text', { separator: '' })).toThrow('Separator must be exactly 1 character long.');
      expect(() => toSlug('text', { separator: '@' })).toThrow("Separator character '@' is not URL safe.");
      expect(() => toSlug('text', { separator: 123 as any })).toThrow('Separator option must be a string.');
    });

    it('should properly trim valid single-character separators from start and end', () => {
      expect(toSlug('_foo_', { separator: '_', preserveSpace: true })).toBe('foo');
      expect(toSlug('~foo~', { separator: '~', preserveSpace: true })).toBe('foo');
      expect(toSlug('  _foo_  ', { separator: '_', preserveSpace: true })).toBe('foo');
    });

    it('should convert text to lowercase and URL safe slug with spaces replaced by separator by default (preserveSpace = false)', () => {
      expect(toSlug('Hello World!')).toBe('hello-world');
      expect(toSlug('  Accented: éàû  ')).toBe('accented-eau');
      expect(toSlug('Some_Under_Scores-And-Spaces')).toBe('some-under-scores-and-spaces');
    });

    it('should preserve spaces as space characters and collapse/trim them if preserveSpace is true', () => {
      expect(toSlug('Hello World!', { preserveSpace: true })).toBe('hello world');
      expect(toSlug('  Accented: éàû  ', { preserveSpace: true })).toBe('accented eau');
      expect(toSlug('Some_Under_Scores-And-Spaces', { preserveSpace: true })).toBe('some-under-scores-and-spaces');
    });

    it('should preserve casing if preserveCase option is true', () => {
      expect(toSlug('Hello World!', { preserveCase: true })).toBe('Hello-World');
      expect(toSlug('Hello World!', { preserveCase: true, preserveSpace: true })).toBe('Hello World');
      expect(toSlug('Preserve CASE', { preserveCase: true })).toBe('Preserve-CASE');
    });

    it('should use custom separator', () => {
      expect(toSlug('Hello World!', { separator: '_', preserveSpace: false })).toBe('hello_world');
      expect(toSlug('Hello World!', { separator: '~', preserveSpace: false })).toBe('hello~world');
    });

    it('should truncate to maxLength', () => {
      expect(toSlug('super-long-string-that-needs-truncation', { maxLength: 10 })).toBe('super-long');
    });

    it('should enforce configurable minLength and maxLength limit configuration validation', () => {
      expect(() => toSlug('text', { minLength: 0 })).toThrow('Minimum slug length configuration cannot be less than 1.');
      expect(() => toSlug('text', { maxLength: 129 })).toThrow('Maximum slug length configuration cannot exceed 128.');
      expect(() => toSlug('text', { minLength: 20, maxLength: 10 })).toThrow('Minimum slug length cannot be greater than maximum slug length.');
    });

    it('should throw error if resulting slug is shorter than minLength', () => {
      expect(() => toSlug('a', { minLength: 5 })).toThrow();
      expect(() => toSlug('!!!', { minLength: 1 })).toThrow();
    });

    it('should validate allowedCharacters option and throw if not URL safe', () => {
      expect(toSlug('hello.world~', { allowedCharacters: '.~' })).toBe('hello.world~'); // dot and tilde are allowed and preserved
      expect(toSlug('hello.world~', { allowedCharacters: '.~', separator: '.' })).toBe('hello.world~');
      expect(() => toSlug('hello', { allowedCharacters: '@' })).toThrow("Allowed character '@' is not URL safe.");
      expect(() => toSlug('hello', { allowedCharacters: '!' })).toThrow("Allowed character '!' is not URL safe.");
      expect(() => toSlug('hello', { allowedCharacters: 123 as any })).toThrow('Allowed characters option must be a string.');
    });

    it('should strip non-allowed characters from given text without throwing', () => {
      expect(toSlug('hello @ world! ☕️', { allowedCharacters: '.', preserveSpace: true })).toBe('hello world');
    });

    it('should phonetically transliterate Arabic, Hebrew, Chinese, Japanese, Korean, Cyrillic, and Greek characters', () => {
      expect(toSlug('مرحبا')).toBe('mrhba');
      expect(toSlug('שלום')).toBe('shlvm');
      expect(toSlug('你好')).toBe('nihao');
      expect(toSlug('안녕하세요')).toBe('annyeonghaseyo');
      expect(toSlug('こんにちは')).toBe('konnichiha');
      expect(toSlug('привет')).toBe('privet');
      expect(toSlug('γεια')).toBe('geia');
      
      expect(toSlug('مرحبا hello עולם')).toBe('mrhba-hello-avlm');
      expect(toSlug('שלום world', { preserveSpace: true })).toBe('shlvm world');
      expect(toSlug('你好 hello', { preserveSpace: false })).toBe('nihao-hello');
    });

    it('should behave identically with the slugify alias', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('Hello World!', { preserveSpace: true })).toBe('hello world');
      expect(slugify('Hello World!', { preserveCase: true, preserveSpace: false, separator: '_' })).toBe('Hello_World');
    });

    describe('new sanitization options', () => {
      it('should handle lowercase and uppercase options', () => {
        expect(toSlug('Hello World', { lowercase: true })).toBe('hello-world');
        expect(toSlug('Hello World', { lowercase: false })).toBe('Hello-World');
        expect(toSlug('Hello World', { uppercase: true })).toBe('HELLO-WORLD');
        expect(() => toSlug('Hello World', { lowercase: true, uppercase: true })).toThrow('Cannot set both lowercase and uppercase to true.');
      });

      it('should handle preserveUnicode option', () => {
        // preserveUnicode = true: keeps Unicode letters/numbers as-is and skips transliteration
        expect(toSlug('مرحبا hello 123!', { preserveUnicode: true })).toBe('مرحبا-hello-123');
        expect(toSlug('안녕하세요 world!', { preserveUnicode: true })).toBe('안녕하세요-world');
        expect(toSlug('Café déjà vu!', { preserveUnicode: true })).toBe('café-déjà-vu');
      });

      it('should handle transliterate option', () => {
        // transliterate = false: disables translit, so Arabic characters (non-ASCII) will be stripped if preserveUnicode = false
        expect(toSlug('مرحبا hello', { transliterate: false })).toBe('hello');
      });

      it('should handle allowedChars option as string and RegExp', () => {
        expect(toSlug('hello @ world! ☕️', { allowedChars: '.', preserveSpace: true })).toBe('hello world');
        expect(toSlug('hello.world~', { allowedChars: /[.~]/ })).toBe('hello.world~');
        expect(toSlug('product-code-1234', { allowedChars: /[0-9]/ })).toBe('product-code-1234');
        expect(() => toSlug('hello', { allowedChars: 123 as any })).toThrow('Allowed characters option must be a string or RegExp.');
      });

      it('should return fallback value if sanitized slug is empty or too short', () => {
        expect(toSlug('!!!', { fallback: 'untitled' })).toBe('untitled');
        expect(toSlug('', { fallback: 'default-slug' })).toBe('default-slug');
        expect(toSlug('a', { minLength: 5, fallback: 'long-fallback' })).toBe('long-fallback');
      });

      it('should respect trim: false option', () => {
        expect(toSlug(' hello world ', { trim: false })).toBe('-hello-world-');
        expect(toSlug('-hello-world-', { trim: false })).toBe('-hello-world-');
        expect(toSlug('hello', { separator: '_', trim: false })).toBe('hello');
      });

      it('should respect collapseSeparators: false option', () => {
        expect(toSlug('hello   world', { collapseSeparators: false })).toBe('hello---world');
        expect(toSlug('hello---world', { collapseSeparators: false })).toBe('hello---world');
        expect(toSlug('hello  world', { preserveSpace: true, collapseSeparators: false })).toBe('hello  world');
      });
    });

    describe('generateSlug prefix, suffix, and separator options', () => {
      it('should support prefix option', () => {
        const slug = generateSlug({ length: 8, prefix: 'user' });
        expect(slug.startsWith('user')).toBe(true);
        expect(slug).toHaveLength(12); // "user" (4) + random (8)
      });

      it('should support suffix option', () => {
        const slug = generateSlug({ length: 8, suffix: 'end' });
        expect(slug.endsWith('end')).toBe(true);
        expect(slug).toHaveLength(11); // random (8) + "end" (3)
      });

      it('should support separator option with prefix and suffix', () => {
        const slug = generateSlug({ length: 8, prefix: 'user', suffix: 'end', separator: '-' });
        expect(slug.startsWith('user-')).toBe(true);
        expect(slug.endsWith('-end')).toBe(true);
        expect(slug).toHaveLength(17); // "user-" (5) + random (8) + "-end" (4)
      });

      it('should throw for invalid prefix, suffix, or separator', () => {
        expect(() => generateSlug({ prefix: 123 as any })).toThrow('Prefix option must be a string.');
        expect(() => generateSlug({ prefix: 'user@' })).toThrow("Prefix character '@' is not URL safe.");
        expect(() => generateSlug({ suffix: 123 as any })).toThrow('Suffix option must be a string.');
        expect(() => generateSlug({ suffix: 'end!' })).toThrow("Suffix character '!' is not URL safe.");
        expect(() => generateSlug({ separator: 123 as any })).toThrow('Separator option must be a string.');
        expect(() => generateSlug({ separator: 'abc' })).toThrow('Separator must be exactly 1 character long.');
        expect(() => generateSlug({ separator: '@' })).toThrow("Separator character '@' is not URL safe.");
      });
    });

    describe('generateUniqueSlug', () => {
      it('should generate a unique slug using sync exists check', async () => {
        const existing = ['abc', 'def'];
        const unique = await generateUniqueSlug({
          length: 3,
          minLength: 3,
          alphabet: 'abcdef',
          exists: (slug) => existing.includes(slug),
          maxRetries: 10
        });
        expect(existing).not.toContain(unique);
        expect(unique).toHaveLength(3);
      });

      it('should generate a unique slug using async exists check', async () => {
        const existing = ['abc', 'def'];
        const unique = await generateUniqueSlug({
          length: 3,
          minLength: 3,
          alphabet: 'abcdef',
          exists: async (slug) => existing.includes(slug)
        });
        expect(existing).not.toContain(unique);
        expect(unique).toHaveLength(3);
      });

      it('should throw if exists is missing or invalid', async () => {
        await expect(generateUniqueSlug(null as any)).rejects.toThrow('Options object is required.');
        await expect(generateUniqueSlug({} as any)).rejects.toThrow('exists option is required and must be a function.');
      });

      it('should throw if maxRetries is exceeded', async () => {
        await expect(
          generateUniqueSlug({
            length: 5,
            exists: () => true, // always taken
            maxRetries: 5
          })
        ).rejects.toThrow('Failed to generate a unique slug after 5 attempts.');
      });
    });
  });
});
