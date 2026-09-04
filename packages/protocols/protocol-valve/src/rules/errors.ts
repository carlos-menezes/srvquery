type UnsupportedServerBrowserProtocolVersionErrorCtor = {
  version: number;
};

/** Error thrown when a server browser protocol message reports a version this parser doesn't handle. */
export class UnsupportedServerBrowserProtocolVersionError extends Error {
  /** Version byte reported by the message. */
  public readonly version: number;

  constructor({ version }: UnsupportedServerBrowserProtocolVersionErrorCtor) {
    super(`Unsupported server browser protocol version: ${version}`);
    this.name = this.constructor.name;
    this.version = version;
  }
}

/** Error thrown when a server browser protocol message's pages are missing or malformed. */
export class IncompleteServerBrowserProtocolMessageError extends Error {
  constructor() {
    super("Incomplete server browser protocol message");
    this.name = this.constructor.name;
  }
}

type InvalidServerBrowserProtocolEscapeSequenceErrorCtor = {
  marker: number;
};

/** Error thrown when a page payload contains an unrecognized 0x01-prefixed escape sequence. */
export class InvalidServerBrowserProtocolEscapeSequenceError extends Error {
  /** Byte following the 0x01 escape marker. */
  public readonly marker: number;

  constructor({ marker }: InvalidServerBrowserProtocolEscapeSequenceErrorCtor) {
    super(
      `Invalid server browser protocol escape sequence: 0x01 0x${marker.toString(16).padStart(2, "0")}`,
    );
    this.name = this.constructor.name;
    this.marker = marker;
  }
}

type UnsupportedServerBrowserProtocolModIdLengthErrorCtor = {
  idLength: number;
};

/** Error thrown when a mod entry declares an ID length this parser doesn't handle. */
export class UnsupportedServerBrowserProtocolModIdLengthError extends Error {
  /** Unsupported ID length declared by the mod entry. */
  public readonly idLength: number;

  constructor({ idLength }: UnsupportedServerBrowserProtocolModIdLengthErrorCtor) {
    super(`Unsupported mod ID length: ${idLength}`);
    this.name = this.constructor.name;
    this.idLength = idLength;
  }
}

type TrailingServerBrowserProtocolDataErrorCtor = {
  remaining: number;
};

/** Error thrown when bytes remain unconsumed after decoding a server browser protocol message. */
export class TrailingServerBrowserProtocolDataError extends Error {
  /** Number of unconsumed bytes remaining in the message. */
  public readonly remaining: number;

  constructor({ remaining }: TrailingServerBrowserProtocolDataErrorCtor) {
    super(`Unexpected trailing server browser protocol data: ${remaining} byte(s)`);
    this.name = this.constructor.name;
    this.remaining = remaining;
  }
}
