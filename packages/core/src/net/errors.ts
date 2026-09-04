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

type QuerySocketErrorCtor = {
  message: string;
  cause: unknown;
};

/**
 * Error thrown for low-level socket failures unrelated to timeout
 * (e.g. DNS resolution failure, ECONNREFUSED, EHOSTUNREACH).
 */
export class QuerySocketError extends Error {
  /** Original socket error that caused the query to fail. */
  public readonly cause: unknown;

  constructor({ message, cause }: QuerySocketErrorCtor) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}
