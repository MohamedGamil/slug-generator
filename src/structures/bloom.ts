import { bytesToBase64Url, base64UrlToBytes } from '../utils.js';

/**
 * MurmurHash3 non-cryptographic hash function implementation.
 *
 * @param key - The string key to hash.
 * @param seed - The seed integer value.
 * @returns A 32-bit unsigned hash integer.
 */
export function murmurHash3(key: string, seed: number): number {
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const len = key.length;
  
  for (let i = 0; i < len; i++) {
    let k1 = key.charCodeAt(i);
    
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }
  
  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;
  
  return h1 >>> 0;
}

/**
 * Probabilistic space-efficient membership checker using Bloom Filter and MurmurHash3.
 * Useful for locally confirming slug uniqueness with zero database reads.
 */
export class BloomFilter {
  private size: number;
  private hashCount: number;
  private bits: Uint32Array;

  /**
   * Initializes a new BloomFilter instance.
   * Calculates optimal bit-array size and hash function count.
   *
   * @param expectedCapacity - The expected number of items to insert. Must be a positive integer.
   * @param falsePositiveRate - The desired false positive probability (0 to 1 exclusive). Defaults to 0.01 (1%).
   * @throws Error if expectedCapacity or falsePositiveRate values are invalid.
   */
  constructor(expectedCapacity: number, falsePositiveRate: number = 0.01) {
    if (!Number.isInteger(expectedCapacity) || expectedCapacity <= 0) {
      throw new Error('Expected capacity must be a positive integer.');
    }
    if (falsePositiveRate <= 0 || falsePositiveRate >= 1) {
      throw new Error('False positive rate must be between 0 and 1 (exclusive).');
    }

    // M = - (N * ln(P)) / (ln(2)^2)
    this.size = Math.ceil(- (expectedCapacity * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    // K = (M / N) * ln(2)
    this.hashCount = Math.max(1, Math.round((this.size / expectedCapacity) * Math.log(2)));
    
    const uint32Length = Math.ceil(this.size / 32);
    this.bits = new Uint32Array(uint32Length);
  }

  /**
   * Adds an item string to the Bloom Filter.
   *
   * @param item - The item to record.
   * @throws Error if item is not a string.
   */
  public add(item: string): void {
    if (typeof item !== 'string') {
      throw new Error('Bloom filter items must be strings.');
    }
    for (let i = 0; i < this.hashCount; i++) {
      const idx = murmurHash3(item, i) % this.size;
      const arrayIdx = Math.floor(idx / 32);
      const bitIdx = idx % 32;
      this.bits[arrayIdx] |= (1 << bitIdx);
    }
  }

  /**
   * Checks if an item string might be in the Bloom Filter (probabilistic check).
   *
   * @param item - The item string to lookup.
   * @returns False if the item is guaranteed not to exist; true if it probably exists.
   * @throws Error if item is not a string.
   */
  public mightContain(item: string): boolean {
    if (typeof item !== 'string') {
      throw new Error('Bloom filter items must be strings.');
    }
    for (let i = 0; i < this.hashCount; i++) {
      const idx = murmurHash3(item, i) % this.size;
      const arrayIdx = Math.floor(idx / 32);
      const bitIdx = idx % 32;
      if ((this.bits[arrayIdx] & (1 << bitIdx)) === 0) {
        return false; // Guaranteed unique!
      }
    }
    return true; // Might contain item
  }

  /**
   * Serializes the Bloom Filter bit array to a Base64 URL-safe string.
   *
   * @returns Base64 URL-safe string representation.
   */
  public export(): string {
    const bytes = new Uint8Array(this.bits.buffer, this.bits.byteOffset, this.bits.byteLength);
    return bytesToBase64Url(bytes);
  }

  /**
   * Reconstructs a Bloom Filter from a serialized Base64 string.
   *
   * @param serialized - The serialized Base64 string.
   * @param expectedCapacity - Expected capacity boundary configured originally.
   * @param falsePositiveRate - False positive rate boundary configured originally.
   * @returns A restored BloomFilter instance.
   * @throws Error if serialized content is invalid or bit sizes mismatch.
   */
  public static import(serialized: string, expectedCapacity: number, falsePositiveRate: number = 0.01): BloomFilter {
    if (typeof serialized !== 'string') {
      throw new Error('Serialized data must be a string.');
    }

    const filter = new BloomFilter(expectedCapacity, falsePositiveRate);
    const bytes = base64UrlToBytes(serialized);
    
    const expectedBytesLength = filter.bits.byteLength;
    if (bytes.length !== expectedBytesLength) {
      throw new Error(`Imported bits size mismatch. Expected ${expectedBytesLength} bytes, got ${bytes.length} bytes.`);
    }

    const targetView = new Uint8Array(filter.bits.buffer, filter.bits.byteOffset, filter.bits.byteLength);
    targetView.set(bytes);
    
    return filter;
  }
}
