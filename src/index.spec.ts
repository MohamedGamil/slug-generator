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

  it('should verify low collision probability', () => {
    const set = new Set<string>();
    const count = 10000;
    for (let i = 0; i < count; i++) {
      set.add(generateSlug({ length: 10 }));
    }
    expect(set.size).toBe(count); // No duplicates in 10k generations
  });
});
