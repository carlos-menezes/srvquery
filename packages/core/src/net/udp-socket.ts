import { ExtractOptional } from "../util/types";
import dgram from "node:dgram";
import { QuerySocketError, QueryTimeoutError } from "./errors";
import { withRetry } from "../util/retry";
import { BufferCursor } from "../bin/buffer-cursor";

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
};

export type UdpSocketSendParams = {
  /** Payload to send over the UDP socket. */
  payload: Buffer;
};

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

export const createUdpSocket = (
  { host, port }: CreateUdpSocketParams,
  { timeout = 2000, type = "udp4" }: CreateUdpSocketOptions = {},
) => {
  const socket = dgram.createSocket({ type });

  const send = (
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
            new QuerySocketError({
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
              new QuerySocketError({
                message: `Failed to send to ${host}:${port}`,
                cause: err,
              }),
            ),
          );
        }
      });
    });
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

export type UdpSocket = ReturnType<typeof createUdpSocket>;
