import { describe, it, expect } from 'vitest';
import { generateSlug } from './index';

describe('slug-generator', () => {
  it('should generate a slug with default length 8', () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(8);
  });

  it('should generate a slug with custom length', () => {
    const slug = generateSlug({ length: 12 });
    expect(slug).toHaveLength(12);
  });

  it('should only use characters from the specified alphabet', () => {
    const customAlphabet = 'ABC';
    const slug = generateSlug({ length: 20, alphabet: customAlphabet });
    for (const char of slug) {
      expect(customAlphabet).toContain(char);
    }
  });

  it('should throw error for length < 5', () => {
    expect(() => generateSlug({ length: 4 })).toThrow();
  });

  it('should throw error for length > 64', () => {
    expect(() => generateSlug({ length: 65 })).toThrow();
  });

  it('should verify low collision probability', () => {
    const set = new Set<string>();
    const count = 10000;
    for (let i = 0; i < count; i++) {
      set.add(generateSlug({ length: 10 }));
    }
    expect(set.size).toBe(count); // No duplicates in 10k generations
  });
});
