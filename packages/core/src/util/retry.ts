import { delay } from "./timing";

export interface RetryOptions<T> {
  /** Total number of attempts, including the first (non-retry) call. */
  retries: number;
  /** ms delay before the next attempt, given the attempt number just completed (1-based). */
  backoff?: (attempt: number) => number;
  /** Return true if this error should stop retrying and be thrown immediately. */
  isFatal?: (err: unknown) => boolean;
  /** Called when all attempts are exhausted. */
  onExhausted?: (lastError: unknown) => T;
}

/**
 * Calls `fn` up to `options.retries` times, retrying on rejection unless
 * `isFatal` says otherwise. If every attempt fails, `onExhausted` (if
 * provided) determines the final outcome; otherwise the last error is thrown.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions<T>): Promise<T> {
  const { retries, backoff, isFatal, onExhausted } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (isFatal?.(err)) throw err;
      if (attempt < retries && backoff) {
        await delay(backoff(attempt));
      }
    }
  }

  if (onExhausted) return onExhausted(lastError);
  throw lastError;
}
