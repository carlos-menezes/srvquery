import { ExtractOptional } from "../util/types";
import dgram from "node:dgram";
import { QuerySocketError, QueryTimeoutError } from "./errors";
import { withRetry } from "../util/retry";

export type UdpQuerySocketCtor = {
  /**
   * Target host.
   */
  host: string;
  /**
   * Target port.
   */
  port: number;
  /**
   * Type of socket (udp4 or udp6).
   * @default "udp4"
   */
  type?: "udp4" | "udp6";
  /**
   * Time in milliseconds to wait for a response to a single send attempt
   * before either retrying or giving up.
   * @default 2000
   */
  timeout?: number;
  /**
   * Number of send attempts before throwing QueryTimeoutError.
   * @default 3
   */
  retries?: number;
};

export interface UdpSocketSendOptions {
  /** Override the instance-level timeout for this specific send. */
  timeout?: number;
  /** Override the instance-level retry count for this specific send. */
  retries?: number;
  /**
   * Optional predicate to reject packets that arrive but don't belong to
   * this request. Return true to accept the packet into the collected set.
   */
  accept?: (packet: Buffer) => boolean;
  /** Called after each accepted packet; return true once enough packets have arrived. */
  end: (packets: Buffer[]) => boolean;
}

export class UdpQuerySocket implements Disposable {
  readonly #host: string;
  readonly #port: number;
  readonly #socket: dgram.Socket;
  readonly #defaultTimeout: number;
  readonly #defaultRetries: number;
  #closed: boolean;

  constructor({ host, port, ...optional }: UdpQuerySocketCtor) {
    const withDefaults: Required<ExtractOptional<UdpQuerySocketCtor>> = {
      type: optional.type ? optional.type : "udp4",
      timeout: optional.timeout ?? 2000,
      retries: optional.retries ?? 3,
    };

    this.#host = host;
    this.#port = port;
    this.#socket = dgram.createSocket({ type: withDefaults.type });
    this.#defaultTimeout = withDefaults.timeout;
    this.#defaultRetries = withDefaults.retries;
    this.#closed = false;
  }

  /**
   * Collects every accepted packet belonging to this request until `end`
   * reports completion (e.g. reassembling a multi-datagram response). The
   * timeout window resets on each accepted packet rather than running once
   * from the initial send.
   */
  async send(payload: Buffer, options: UdpSocketSendOptions): Promise<Buffer[]> {
    const withDefaults: Required<ExtractOptional<UdpSocketSendOptions>> = {
      timeout: options.timeout ?? this.#defaultTimeout,
      retries: options.retries ?? this.#defaultRetries,
      accept: options.accept ?? (() => true),
    };

    return withRetry(
      () => this.#sendOnce(payload, withDefaults.timeout, withDefaults.accept, options.end),
      {
        retries: withDefaults.retries,
        backoff: (attempt) => attempt * 100,
        isFatal: (err) => err instanceof QuerySocketError,
        onExhausted: () => {
          throw new QueryTimeoutError({
            host: this.#host,
            port: this.#port,
            attempts: withDefaults.retries,
          });
        },
      },
    );
  }

  /**
   * Runs a single send attempt and gathers responses for it. Retrying
   * across multiple attempts is handled by the caller via `withRetry`, so
   * this method only ever represents one attempt: one outgoing datagram,
   * followed by zero or more incoming datagrams.
   *
   * Every incoming UDP message on the socket is passed to `accept`; the
   * ones that return `false` are ignored (e.g. stray replies to a previous,
   * already-settled query). Accepted packets are pushed onto an array which
   * is passed to `end` after each addition. Once `end` returns true,
   * the promise resolves with the accepted packets collected so far. This
   * The caller can finish after one packet or wait for several packets that
   * together make up one logical response (e.g. a split multi-datagram reply).
   *
   * The timeout does not simply expire once after `timeout` ms from the
   * initial send: it is restarted every time a packet is accepted but
   * `end` is still false. This means the timeout really bounds the gap
   * between packets (or since the send, for the first one), not the total
   * time to collect everything, and thus a slow trickle of valid packets keeps
   * resetting the clock instead of timing out mid-response.
   *
   * The returned promise settles exactly once: it resolves when `end`
   * reports completion or rejects with `QueryTimeoutError` if no
   * qualifying packet arrives within `timeout` ms, or rejects with
   * `QuerySocketError` if the underlying socket errors or the outgoing
   * `send` call itself fails. Whichever happens first tears down the
   * `message`/`error` listeners and clears the timer so later events can't
   * settle the promise a second time.
   *
   * @param payload Raw bytes to send to the configured host/port.
   * @param timeout Milliseconds to wait for the next accepted packet before rejecting.
   * @param accept Predicate deciding whether an incoming datagram belongs to this attempt.
   * @param end Predicate deciding, after each accepted packet, whether enough have arrived.
   * @returns The accepted packets, in the order they were received, once `end` is satisfied.
   */
  #sendOnce(
    payload: Buffer,
    timeout: number,
    accept: (packet: Buffer) => boolean,
    end: (packets: Buffer[]) => boolean,
  ): Promise<Buffer[]> {
    if (this.#closed) {
      throw new QuerySocketError({
        message: "Cannot send on a closed UdpQuerySocket",
        cause: new Error("socket closed"),
      });
    }

    return new Promise<Buffer[]>((resolve, reject) => {
      let settled = false;
      const packets: Buffer[] = [];
      let timer: ReturnType<typeof setTimeout>;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          settle(() =>
            reject(
              new QueryTimeoutError({
                host: this.#host,
                port: this.#port,
                attempts: 1,
              }),
            ),
          );
        }, timeout);
      };

      const onMessage = (msg: Buffer) => {
        if (settled || !accept(msg)) return; // ignore stray/unrelated packets
        packets.push(msg);
        if (end(packets)) {
          settle(() => resolve(packets));
        } else {
          resetTimer();
        }
      };

      const onError = (err: Error) => {
        settle(() =>
          reject(
            new QuerySocketError({
              message: `Socket error querying ${this.#host}:${this.#port}`,
              cause: err,
            }),
          ),
        );
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.#socket.off("message", onMessage);
        this.#socket.off("error", onError);
      };

      this.#socket.on("message", onMessage);
      this.#socket.on("error", onError);

      resetTimer();
      this.#socket.send(payload, this.#port, this.#host, (err) => {
        if (err) {
          settle(() =>
            reject(
              new QuerySocketError({
                message: `Failed to send to ${this.#host}:${this.#port}`,
                cause: err,
              }),
            ),
          );
        }
      });
    });
  }

  close(): void {
    if (this.#closed) return;
    this.#socket.close();
    this.#closed = true;
  }

  [Symbol.dispose](): void {
    this.close();
  }
}
