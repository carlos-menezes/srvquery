import http from "node:http";
import https from "node:https";
import { QueryTransportError, QueryTimeoutError } from "./errors";
import { RetryOptions, withRetry } from "../util/retry";

/** Destination addressed by an HTTP query client. */
export type CreateHttpClientParams = {
  /**
   * Target host.
   */
  host: string;
  /**
   * Target port.
   */
  port: number;
};

/** Transport and retry settings for an HTTP query client. */
export type CreateHttpClientOptions = {
  /**
   * URL scheme used to reach the server.
   * @default "http"
   */
  protocol?: "http" | "https";
  /**
   * Time in milliseconds to wait for a response to a single request attempt.
   * @default 2000
   */
  timeout?: number;
  /** Retry behavior for each call to `getJson`. Retries are disabled when omitted. */
  retry?: RetryOptions;
};

/** HTTP transport bound to a single query destination. */
export interface HttpClient {
  /**
   * Requests `path` and resolves with its response body parsed as JSON.
   * @param path Path (including leading `/`) to request, relative to the client's base URL.
   * @returns The parsed JSON response body.
   */
  getJson<T = unknown>(path: string): Promise<T>;
  /** Destination associated with this client. */
  readonly ctx: Readonly<CreateHttpClientParams>;
}

const transports = { http, https } as const;

/**
 * Creates a reusable HTTP query client for one destination.
 *
 * Intended for query protocols that expose their state over plain JSON HTTP endpoints. Each `getJson` call is subject to the configured timeout and, when provided, retried according to `options.retry`.
 */
export const createHttpClient = (
  { host, port }: CreateHttpClientParams,
  { protocol = "http", timeout = 2000, retry }: CreateHttpClientOptions = {},
): HttpClient => {
  const { request } = transports[protocol];

  const attempt = <T>(path: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const req = request({ host, port, path, method: "GET" }, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const { statusCode = 0 } = res;

          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new QueryTransportError({
                message: `Received HTTP ${statusCode} from ${protocol}://${host}:${port}${path}`,
                cause: undefined,
              }),
            );
            return;
          }

          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
          } catch (err) {
            reject(
              new QueryTransportError({
                message: `Received a non-JSON response from ${protocol}://${host}:${port}${path}`,
                cause: err,
              }),
            );
          }
        });
      });

      req.setTimeout(timeout, () => {
        req.destroy(new QueryTimeoutError({ host, port, attempts: 1 }));
      });

      req.on("error", (err) => {
        if (err instanceof QueryTimeoutError) {
          reject(err);
          return;
        }
        reject(
          new QueryTransportError({
            message: `Failed to query ${protocol}://${host}:${port}${path}`,
            cause: err,
          }),
        );
      });

      req.end();
    });

  const getJson = async <T>(path: string): Promise<T> => {
    if (!retry) return attempt<T>(path);

    try {
      return await withRetry(() => attempt<T>(path), retry);
    } catch (lastError) {
      if (lastError instanceof QueryTimeoutError) {
        throw new QueryTimeoutError({ host, port, attempts: retry.retries });
      }
      throw lastError;
    }
  };

  return {
    getJson,
    ctx: {
      host,
      port,
    },
  } as const;
};
