export interface GenerateSlugOptions {
  /**
   * The target length of the generated slug. Defaults to `8`.
   */
  length?: number;
  /**
   * The set of allowed characters for the slug. Defaults to `A-Z`, `a-z`, `0-9`, `-`, and `_`.
   */
  alphabet?: string;
  /**
   * The minimum allowable generated slug length configuration boundary. Defaults to `5`. Must be >= 2.
   */
  minLength?: number;
  /**
   * The maximum allowable generated slug length configuration boundary. Defaults to `64`. Must be <= 64.
   */
  maxLength?: number;
  /**
   * Optional fixed prefix to prepend to the slug.
   */
  prefix?: string;
  /**
   * Optional fixed suffix to append to the slug.
   */
  suffix?: string;
  /**
   * Separator character between prefix/suffix and the random part. Defaults to no separator if not provided. Must be exactly 1 character and belong to `a-zA-Z0-9-_.~`.
   */
  separator?: string;
}

export interface ToSlugOptions {
  /**
   * If true, preserves the original casing. If false (default), lowercases all characters.
   */
  preserveCase?: boolean;
  /**
   * If true, preserves space characters as literal spaces `" "`. If false (default), replaces them with the separator.
   */
  preserveSpace?: boolean;
  /**
   * The minimum allowable length configuration for the sanitized slug. Defaults to `1`. Must be >= 1.
   */
  minLength?: number;
  /**
   * The maximum allowable length configuration for the sanitized slug. Defaults to `128`. Must be <= 128.
   */
  maxLength?: number;
  /**
   * A single URL-safe character used to replace spacing/hyphens/underscores. Defaults to `'-'`. Must be exactly 1 character and belong to `a-zA-Z0-9-_.~`.
   */
  separator?: string;
  /**
   * A string containing custom allowed characters to preserve in the sanitized slug. Must only contain URL-safe characters (`a-zA-Z0-9-_.~`).
   */
  allowedCharacters?: string;
  /**
   * If true, converts the output to lowercase. Defaults to true if not specified.
   */
  lowercase?: boolean;
  /**
   * If true, converts the output to uppercase. Defaults to false.
   */
  uppercase?: boolean;
  /**
   * If true, preserves Unicode letters and numbers instead of converting to ASCII. Defaults to false.
   */
  preserveUnicode?: boolean;
  /**
   * If true, converts non-Latin scripts to ASCII phonetic equivalents. Defaults to true.
   */
  transliterate?: boolean;
  /**
   * Custom characters (either string or RegExp) allowed to remain in the sanitized slug.
   */
  allowedChars?: RegExp | string;
  /**
   * A fallback string value to return if the sanitized slug is empty or too short. Set this option value to `%AUTO%` to generate a random 8 characters long slug.
   */
  fallback?: string;
  /**
   * If true, trims leading and trailing separators. Defaults to true.
   */
  trim?: boolean;
  /**
   * If true, collapses multiple consecutive separators. Defaults to true.
   */
  collapseSeparators?: boolean;
}

export interface GenerateUniqueSlugOptions extends GenerateSlugOptions {
  /**
   * Validation function to check if the generated slug already exists.
   * Must return `true` if the slug exists (is taken) and `false` if it is unique.
   */
  exists: (slug: string) => boolean | Promise<boolean>;
  /**
   * Maximum number of attempts to generate a unique slug before throwing an error. Defaults to `100`.
   */
  maxRetries?: number;
}

export interface SnowflakeOptions {
  /**
   * Epoch timestamp in milliseconds. Defaults to January 1, 2026 (1767225600000n).
   */
  epoch?: number | bigint;
  /**
   * Worker/Machine identifier (0-1023). Defaults to 0.
   */
  workerId?: number | bigint;
}

export interface ObfuscatedSequenceOptions {
  /**
   * Custom alphabet to encode the scrambled ID. Defaults to standard base64 URL safe.
   */
  alphabet?: string;
  /**
   * Minimum length of the output slug. Defaults to 6.
   */
  minLength?: number;
  /**
   * Co-prime multiplier for Knuth's multiplicative hash. Defaults to 2654435761n.
   */
  multiplier?: bigint;
  /**
   * Modulo divisor (e.g. range of sequence). Defaults to 4294967296n (2^32).
   */
  modulo?: bigint;
}
