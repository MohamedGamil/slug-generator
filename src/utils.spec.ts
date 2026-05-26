import { describe, it, expect } from 'vitest';
import { bytesToBase64Url, base64UrlToBytes, DEFAULT_ALPHABET } from './index.js';

describe('Common Utilities Suite', () => {

  describe('Base64 URL encoding and decoding', () => {
    it('should encode bytes to url-safe base64 string without padding', () => {
      // Test cases with differing lengths to verify padding exclusion
      const cases = [
        { bytes: new Uint8Array([]), expected: '' },
        { bytes: new Uint8Array([0]), expected: 'AA' },
        { bytes: new Uint8Array([0, 1]), expected: 'AAE' },
        { bytes: new Uint8Array([0, 1, 2]), expected: 'AAEC' },
        { bytes: new Uint8Array([255, 254, 253, 252]), expected: '__79_A' },
      ];

      for (const tc of cases) {
        expect(bytesToBase64Url(tc.bytes)).toBe(tc.expected);
      }
    });

    it('should decode url-safe base64 strings back to bytes correctly', () => {
      const cases = [
        { str: '', expected: new Uint8Array([]) },
        { str: 'AA', expected: new Uint8Array([0]) },
        { str: 'AAE', expected: new Uint8Array([0, 1]) },
        { str: 'AAEC', expected: new Uint8Array([0, 1, 2]) },
        { str: '__79_A', expected: new Uint8Array([255, 254, 253, 252]) },
      ];

      for (const tc of cases) {
        expect(base64UrlToBytes(tc.str)).toEqual(tc.expected);
      }
    });

    it('should perform round-trip encoding and decoding successfully', () => {
      // Generate some random bytes
      const originalBytes = new Uint8Array(100);
      for (let i = 0; i < originalBytes.length; i++) {
        originalBytes[i] = Math.floor(Math.random() * 256);
      }

      const encoded = bytesToBase64Url(originalBytes);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

      const decoded = base64UrlToBytes(encoded);
      expect(decoded).toEqual(originalBytes);
    });

    it('should contain only URL safe characters in DEFAULT_ALPHABET', () => {
      expect(DEFAULT_ALPHABET).toHaveLength(64);
      expect(DEFAULT_ALPHABET).not.toContain('+');
      expect(DEFAULT_ALPHABET).not.toContain('/');
      expect(DEFAULT_ALPHABET).not.toContain('=');
      
      for (const char of DEFAULT_ALPHABET) {
        expect('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_').toContain(char);
      }
    });
  });

});
