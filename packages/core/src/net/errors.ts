type QueryTimeoutErrorCtor = {
  host: string;
  port: number;
  attempts: number;
};

/**
 * Error thrown when a query does not receive any response within the
 * configured timeout window, after all retries have been exhausted.
 */
export class QueryTimeoutError extends Error {
  /** Host targeted by the query. */
  public readonly host: string;
  /** Port targeted by the query. */
  public readonly port: number;
  /** Total number of attempts made before the timeout was reported. */
  public readonly attempts: number;

  constructor({ host, port, attempts }: QueryTimeoutErrorCtor) {
    super(
      `Query to ${host}:${port} timed out after ${attempts} attempt${attempts === 1 ? "" : "s"}`,
    );
    this.name = this.constructor.name;
    this.host = host;
    this.port = port;
    this.attempts = attempts;
  }
}

type QueryTransportErrorCtor = {
  message: string;
  cause: unknown;
};

/**
 * Error thrown for transport-level failures unrelated to timeout: low-level socket failures
 * (e.g. `ECONNREFUSED`, `EHOSTUNREACH`), non-2xx HTTP responses, and malformed response bodies.
 */
export class QueryTransportError extends Error {
  /** Original error that caused the query to fail, if any. */
  public readonly cause: unknown;

  constructor({ message, cause }: QueryTransportErrorCtor) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

type QueryDnsResolutionErrorCtor = {
  host: string;
  cause: unknown;
};

/** Error thrown when a hostname cannot be resolved to an IPv4 address. */
export class QueryDnsResolutionError extends Error {
  /** Hostname that failed to resolve. */
  public readonly host: string;
  /** Original DNS lookup error. */
  public readonly cause: unknown;

  constructor({ host, cause }: QueryDnsResolutionErrorCtor) {
    super(`Failed to resolve host "${host}" to an IPv4 address`);
    this.name = this.constructor.name;
    this.host = host;
    this.cause = cause;
  }
}
