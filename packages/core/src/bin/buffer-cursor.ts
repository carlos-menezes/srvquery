/** Reads typed values sequentially from a buffer while tracking the current offset. */
export class BufferCursor {
  #offset = 0;

  /**
   * Creates a cursor positioned at the start of a buffer.
   * @param buffer Buffer to read from.
   */
  constructor(readonly buffer: Buffer) {}

  /** Zero-based position of the next byte to read. */
  get offset(): number {
    return this.#offset;
  }

  /** Number of unread bytes after the current offset. */
  get remaining(): number {
    return this.buffer.length - this.#offset;
  }

  /** Reads an unsigned 8-bit integer and advances the cursor by one byte. */
  readUInt8(): number {
    const value = this.buffer.readUInt8(this.#offset);
    this.#offset += 1;
    return value;
  }

  /** Reads a little-endian unsigned 16-bit integer and advances the cursor by two bytes. */
  readUInt16LE(): number {
    const value = this.buffer.readUInt16LE(this.#offset);
    this.#offset += 2;
    return value;
  }

  /** Reads a little-endian signed 32-bit integer and advances the cursor by four bytes. */
  readInt32LE(): number {
    const value = this.buffer.readInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  /** Reads a little-endian unsigned 32-bit integer and advances the cursor by four bytes. */
  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  /** Reads a little-endian 32-bit float and advances the cursor by four bytes. */
  readFloatLE(): number {
    const value = this.buffer.readFloatLE(this.#offset);
    this.#offset += 4;
    return value;
  }

  /** Reads a little-endian unsigned 64-bit integer and advances the cursor by eight bytes. */
  readBigUInt64LE(): bigint {
    const value = this.buffer.readBigUInt64LE(this.#offset);
    this.#offset += 8;
    return value;
  }

  /**
   * Reads a null-terminated UTF-8 string.
   * Advances to the byte after the terminator, or to the end when no terminator is present.
   */
  readCString(): string {
    const terminator = this.buffer.indexOf(0, this.#offset);
    const value = this.buffer.toString(
      "utf8",
      this.#offset,
      terminator === -1 ? this.buffer.length : terminator,
    );
    this.#offset = terminator === -1 ? this.buffer.length : terminator + 1;
    return value;
  }

  /**
   * Reads a buffer view of the requested length and advances the cursor.
   * @throws {RangeError} When `length` is invalid or exceeds the remaining bytes.
   */
  readBytes(length: number): Buffer {
    if (!Number.isInteger(length) || length < 0 || length > this.remaining) {
      throw new RangeError("Read length is outside the buffer bounds");
    }
    const value = this.buffer.subarray(this.#offset, this.#offset + length);
    this.#offset += length;
    return value;
  }

  /**
   * Advances the cursor without reading bytes.
   * @throws {RangeError} When `length` is invalid or exceeds the remaining bytes.
   */
  skip(length: number): void {
    if (!Number.isInteger(length) || length < 0 || length > this.remaining) {
      throw new RangeError("Skip length is outside the buffer bounds");
    }
    this.#offset += length;
  }

  /** Reads all unread bytes and advances the cursor to the end of the buffer. */
  readRemaining(): Buffer {
    const value = this.buffer.subarray(this.#offset);
    this.#offset = this.buffer.length;
    return value;
  }
}
