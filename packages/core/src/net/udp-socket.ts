import dgram from "node:dgram";
import { QueryTransportError, QueryTimeoutError } from "./errors";
import { RetryOptions, withRetry } from "../util/retry";

/** Destination addressed by a UDP query socket. */
export type CreateUdpSocketParams = {
  /**
   * Target host.
   */
  host: string;
  /**
   * Target port.
   */
  port: number;
};

/** Transport and retry settings for a UDP query socket. */
export type CreateUdpSocketOptions = {
  /**
   * Type of socket (udp4 or udp6).
   * @default "udp4"
   */
  type?: "udp4" | "udp6";
  /**
   * Time in milliseconds to wait for a response to a single send attempt.
   * @default 2000
   */
  timeout?: number;
  /** Retry behavior for each call to `send`. Retries are disabled when omitted. */
  retry?: RetryOptions;
};

/** Payload sent by a UDP query. */
export type UdpSocketSendParams = {
  /** Payload to send over the UDP socket. */
  payload: Buffer;
};

/** Packet filtering and completion callbacks for a UDP query. */
export type UdpSocketSendOptions = {
  /**
   * Called to determine if a received packet should be accepted.
   * @param packet The received packet.
   * @returns `true` if the packet should be accepted, `false` otherwise.
   */
  accept?: (packet: Buffer) => boolean;
  /**
   * Called after each accepted packet.
   * Return true once enough packets have arrived.
   * @default `() => true` (always end after the first accepted packet)
   */
  end?: (packets: Buffer[]) => boolean;
};

/** UDP transport bound to a single query destination. */
export interface UdpSocket {
  /** Sends a payload and resolves with the accepted response packets. */
  send(params: UdpSocketSendParams, options?: UdpSocketSendOptions): Promise<Buffer[]>;
  /** Destination associated with this socket. */
  readonly ctx: Readonly<CreateUdpSocketParams>;
  /** Closes the underlying UDP socket. */
  close(): void;
  /** Closes the underlying UDP socket when leaving a `using` scope. */
  [Symbol.dispose](): void;
}

/**
 * Creates a reusable UDP query socket for one destination.
 *
 * Each `send` call collects accepted packets until its completion callback succeeds. When retry
 * options are configured, a timed-out or failed send is repeated on the same socket.
 */
export const createUdpSocket = (
  { host, port }: CreateUdpSocketParams,
  { timeout = 2000, type = "udp4", retry }: CreateUdpSocketOptions = {},
): UdpSocket => {
  const socket = dgram.createSocket({ type });

  const sendAttempt = (
    { payload }: UdpSocketSendParams,
    { accept = () => true, end = () => true }: UdpSocketSendOptions = {},
  ) => {
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
                host,
                port,
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
            new QueryTransportError({
              message: `Socket error querying ${host}:${port}`,
              cause: err,
            }),
          ),
        );
      };

      const cleanup = () => {
        clearTimeout(timer);
        socket.off("message", onMessage);
        socket.off("error", onError);
      };

      socket.on("message", onMessage);
      socket.on("error", onError);

      resetTimer();
      socket.send(payload, port, host, (err) => {
        if (err) {
          settle(() =>
            reject(
              new QueryTransportError({
                message: `Failed to send to ${host}:${port}`,
                cause: err,
              }),
            ),
          );
        }
      });
    });
  };

  const send = async (params: UdpSocketSendParams, options: UdpSocketSendOptions = {}) => {
    if (!retry) return sendAttempt(params, options);

    try {
      return await withRetry(() => sendAttempt(params, options), retry);
    } catch (lastError) {
      if (lastError instanceof QueryTimeoutError) {
        throw new QueryTimeoutError({ host, port, attempts: retry.retries });
      }
      throw lastError;
    }
  };

  return {
    send,
    ctx: {
      host,
      port,
    },
    close: () => {
      socket.close();
    },
    [Symbol.dispose]: () => {
      socket.close();
    },
  } as const;
};
