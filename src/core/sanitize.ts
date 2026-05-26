import { Transliterator } from './transliterator.js';
import { URL_SAFE_CHARACTERS } from '../utils.js';
import { RandomSlugGenerator } from './random.js';
import { ToSlugOptions } from '../types.js';

/**
 * Service class for sanitizing arbitrary text and strings into URL-safe slug formats.
 * Handles casing, space collapsing, custom characters preservation, and phonetic transliteration.
 */
export class TextSlugifier {
  /**
   * Sanitizes arbitrary UTF-8 text into a URL-friendly slug based on option parameters.
   *
   * @param text - The input text to format and sanitize.
   * @param options - Configuration options for character sets, casing, transliteration, and separator details.
   * @returns The formatted URL-safe slug.
   * @throws Error if input verification or configuration constraints are breached.
   */
  public static sanitize(text: string, options: ToSlugOptions = {}): string {
    if (typeof text !== 'string') {
      throw new Error('Input text must be a string.');
    }

    const opts = options ?? {};
    const minLength = opts.minLength ?? 1;
    const maxLength = opts.maxLength ?? 128;
    const separator = typeof opts.separator === 'string' ? opts.separator : '-';

    if (opts.separator !== undefined && typeof opts.separator !== 'string') {
      throw new Error('Separator option must be a string.');
    }

    if (typeof opts.separator === 'string') {
      if (opts.separator.length !== 1) {
        throw new Error('Separator must be exactly 1 character long.');
      }
      if (!URL_SAFE_CHARACTERS.has(opts.separator)) {
        throw new Error(`Separator character '${opts.separator}' is not URL safe.`);
      }
    }

    if (opts.allowedCharacters !== undefined && typeof opts.allowedCharacters !== 'string') {
      throw new Error('Allowed characters option must be a string.');
    }

    if (opts.allowedChars !== undefined && typeof opts.allowedChars !== 'string' && !(opts.allowedChars instanceof RegExp)) {
      throw new Error('Allowed characters option must be a string or RegExp.');
    }

    const allowedCharsOption = opts.allowedChars !== undefined ? opts.allowedChars : opts.allowedCharacters;
    if (typeof allowedCharsOption === 'string') {
      for (const char of allowedCharsOption) {
        if (!URL_SAFE_CHARACTERS.has(char)) {
          throw new Error(`Allowed character '${char}' is not URL safe.`);
        }
      }
    }

    if (opts.lowercase === true && opts.uppercase === true) {
      throw new Error('Cannot set both lowercase and uppercase to true.');
    }

    if (!Number.isInteger(minLength)) {
      throw new Error('Minimum slug length configuration must be an integer.');
    }
    if (!Number.isInteger(maxLength)) {
      throw new Error('Maximum slug length configuration must be an integer.');
    }

    if (minLength < 1) {
      throw new Error('Minimum slug length configuration cannot be less than 1.');
    }
    if (maxLength > 128) {
      throw new Error('Maximum slug length configuration cannot exceed 128.');
    }
    if (minLength > maxLength) {
      throw new Error('Minimum slug length cannot be greater than maximum slug length.');
    }

    let sanitized = text;

    // Transliterate non-Latin scripts to their phonetic ASCII equivalents before normalization
    const shouldTransliterate = opts.transliterate !== false && !opts.preserveUnicode;
    if (shouldTransliterate && Transliterator.hasNonAscii(sanitized)) {
      sanitized = Transliterator.transliterate(sanitized);
    }

    // Normalize to decompose accents (e.g. é -> e) unless preserving Unicode
    if (opts.preserveUnicode) {
      sanitized = sanitized.normalize('NFC');
    } else {
      sanitized = sanitized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    // Apply Casing options
    let targetCase: 'lower' | 'upper' | 'preserve' = 'lower';
    if (opts.preserveCase || opts.lowercase === false) {
      targetCase = 'preserve';
    } else if (opts.uppercase === true) {
      targetCase = 'upper';
    }

    if (targetCase === 'lower') {
      sanitized = sanitized.toLowerCase();
    } else if (targetCase === 'upper') {
      sanitized = sanitized.toUpperCase();
    }

    // Filter allowed characters
    if (allowedCharsOption instanceof RegExp) {
      const testRegex = new RegExp(allowedCharsOption.source, allowedCharsOption.flags.replace('g', ''));
      const defaultPattern = opts.preserveUnicode ? /[\p{L}\p{N}\s\-_]/u : /[a-zA-Z0-9\s\-_]/;
      sanitized = Array.from(sanitized)
        .filter(char => defaultPattern.test(char) || testRegex.test(char))
        .join('');
    } else {
      let allowedPattern: string;
      const escapedCustom = typeof allowedCharsOption === 'string'
        ? allowedCharsOption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : '';

      if (opts.preserveUnicode) {
        allowedPattern = `\\p{L}\\p{N}\\s\\-_${escapedCustom}`;
        const sanitizationRegex = new RegExp(`[^${allowedPattern}]`, 'gu');
        sanitized = sanitized.replace(sanitizationRegex, '');
      } else {
        allowedPattern = `a-zA-Z0-9\\s\\-_${escapedCustom}`;
        const sanitizationRegex = new RegExp(`[^${allowedPattern}]`, 'g');
        sanitized = sanitized.replace(sanitizationRegex, '');
      }
    }

    // Handle spacing and replacement
    if (opts.preserveSpace) {
      if (opts.collapseSeparators !== false) {
        sanitized = sanitized.replace(/[^\S ]+|[-_]+/g, separator);
        sanitized = sanitized.replace(/ +/g, ' ');
      } else {
        sanitized = sanitized.replace(/[^\S ]/g, separator).replace(/[-_]/g, separator);
      }
    } else {
      if (opts.collapseSeparators !== false) {
        sanitized = sanitized.replace(/[\s\-_]+/g, separator);
      } else {
        sanitized = sanitized.replace(/[\s\-_]/g, separator);
      }
    }

    // Trim leading/trailing separators and spaces (if preserveSpace is true)
    const escapedSeparator = separator ? separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const trimParts: string[] = [];
    if (escapedSeparator) {
      trimParts.push(`(?:${escapedSeparator})`);
    }
    if (opts.preserveSpace) {
      trimParts.push('\\s');
    }
    const trimRegExp = trimParts.length > 0 
      ? new RegExp(`^(?:${trimParts.join('|')})+|(?:${trimParts.join('|')})+$`, 'g')
      : null;

    if (trimRegExp && opts.trim !== false) {
      sanitized = sanitized.replace(trimRegExp, '');
    }

    // Truncate to maximum length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
      if (trimRegExp && opts.trim !== false) {
        sanitized = sanitized.replace(trimRegExp, '');
      }
    }

    if (sanitized.length < minLength) {
      if (opts.fallback !== undefined) {
        return String(opts.fallback ?? '').trim().toUpperCase() === '%AUTO%'
          ? RandomSlugGenerator.generate()
          : opts.fallback;
      }
      throw new Error(`Sanitized slug length (${sanitized.length}) is less than minimum required length (${minLength}).`);
    }

    return sanitized;
  }
}
