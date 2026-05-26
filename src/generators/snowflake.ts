import { SnowflakeOptions } from '../types.js';
import { DEFAULT_ALPHABET } from '../utils.js';

/**
 * Generator class for creating Twitter-compatible 64-bit Snowflake identifiers.
 * Includes epoch timestamp, worker identifier, and millisecond sequence rollover bits.
 * Supports output formatting as raw BigInt, decimal string, or compact URL-safe base64 slug.
 */
export class SnowflakeSlugGenerator {
  private epoch: bigint;
  private workerId: bigint;
  private lastTimestamp = -1n;
  private sequence = 0n;

  /**
   * Initializes a new SnowflakeSlugGenerator instance.
   *
   * @param options - Configuration options containing workerId (0-1023) and custom epoch.
   * @throws Error if workerId is out of bounds.
   */
  constructor(options: SnowflakeOptions = {}) {
    this.epoch = BigInt(options.epoch ?? 1767225600000n); // Default Epoch: Jan 1, 2026
    const wId = BigInt(options.workerId ?? 0n);
    if (wId < 0n || wId > 1023n) {
      throw new Error('Worker ID must be between 0 and 1023.');
    }
    this.workerId = wId;
  }

  /**
   * Generates a raw 64-bit Snowflake ID represented as a BigInt.
   *
   * @returns A 64-bit BigInt identifier.
   * @throws Error if system clock is running backwards relative to the configured epoch.
   */
  public generate(): bigint {
    let timestamp = BigInt(Date.now());
    const offset = timestamp - this.epoch;

    if (offset < 0n) {
      throw new Error('Clock is running backwards or epoch is in the future.');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        // Sequence overflow in the current millisecond: wait until next millisecond
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const timeShift = (timestamp - this.epoch) << 22n;
    const workerShift = this.workerId << 12n;

    return timeShift | workerShift | this.sequence;
  }

  /**
   * Generates a raw Snowflake ID represented as a decimal string.
   *
   * @returns The 64-bit identifier as a decimal string.
   */
  public generateString(): string {
    return this.generate().toString();
  }

  /**
   * Bijectively encodes a bigint into a URL-safe Base64 representation.
   *
   * @param num - The BigInt to encode.
   * @returns Encoded Base64 URL-safe string.
   */
  public static base64UrlEncode(num: bigint): string {
    let n = num;
    if (n === 0n) {
      return DEFAULT_ALPHABET[0];
    }
    let result = '';
    const base = 64n;

    while (n > 0n) {
      result = DEFAULT_ALPHABET[Number(n % base)] + result;
      n = n / base;
    }

    return result;
  }

  /**
   * Generates a compact base64 URL-safe slug representation of the Snowflake ID.
   *
   * @returns A compact URL-safe Base64 string.
   */
  public generateSlug(): string {
    return SnowflakeSlugGenerator.base64UrlEncode(this.generate());
  }
}
