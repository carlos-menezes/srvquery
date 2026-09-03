export class BufferCursor {
  #offset = 0;

  constructor(readonly buffer: Buffer) {}

  get offset(): number {
    return this.#offset;
  }

  get remaining(): number {
    return this.buffer.length - this.#offset;
  }

  readUInt8(): number {
    const value = this.buffer.readUInt8(this.#offset);
    this.#offset += 1;
    return value;
  }

  readUInt16LE(): number {
    const value = this.buffer.readUInt16LE(this.#offset);
    this.#offset += 2;
    return value;
  }

  readInt32LE(): number {
    const value = this.buffer.readInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  readFloatLE(): number {
    const value = this.buffer.readFloatLE(this.#offset);
    this.#offset += 4;
    return value;
  }

  readBigUInt64LE(): bigint {
    const value = this.buffer.readBigUInt64LE(this.#offset);
    this.#offset += 8;
    return value;
  }

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

  readBytes(length: number): Buffer {
    if (!Number.isInteger(length) || length < 0 || length > this.remaining) {
      throw new RangeError("Read length is outside the buffer bounds");
    }
    const value = this.buffer.subarray(this.#offset, this.#offset + length);
    this.#offset += length;
    return value;
  }

  skip(length: number): void {
    if (!Number.isInteger(length) || length < 0 || length > this.remaining) {
      throw new RangeError("Skip length is outside the buffer bounds");
    }
    this.#offset += length;
  }

  readRemaining(): Buffer {
    const value = this.buffer.subarray(this.#offset);
    this.#offset = this.buffer.length;
    return value;
  }
}
