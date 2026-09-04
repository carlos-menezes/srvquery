import { delay } from "./timing";

/** Calculates the delay before retrying after a failed, one-based attempt. */
export type RetryStrategy = (attempt: number) => number;

/** Exponential retry strategy producing delays of 100 ms, 200 ms, 400 ms, and so on. */
export const backoffStrategy: RetryStrategy = (attempt) => 100 * 2 ** (attempt - 1);

/** Controls how an asynchronous operation is retried after failure. */
export interface RetryOptions {
  /** Total number of attempts, including the first (non-retry) call. */
  retries: number;
  /** ms delay before the next attempt, given the attempt number just completed (1-based). */
  strategy?: RetryStrategy;
  /** Return true if this error should stop retrying and be thrown immediately. */
  fatal?: (err: unknown) => boolean;
}

/** Default retry policy: three attempts with exponential backoff. */
export const defaultRetryOptions = Object.freeze({
  retries: 3,
  strategy: backoffStrategy,
}) satisfies RetryOptions;

/**
 * Calls `fn` up to `options.retries` times, retrying on rejection unless
 * `fatal` says otherwise. Throws the last error when every attempt fails.
 * @param fn Asynchronous operation to execute.
 * @param options Attempt count, delay strategy, and fatal-error predicate.
 * @returns The first successful result.
 * @throws The fatal error or the final error after all attempts fail.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, strategy, fatal } = options;
  if (!Number.isInteger(retries) || retries < 1) {
    throw new RangeError("Retry option 'retries' must be a positive integer");
  }
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (fatal?.(err)) throw err;
      if (attempt < retries && strategy) {
        await delay(strategy(attempt));
      }
    }
  }

  throw lastError;
}
