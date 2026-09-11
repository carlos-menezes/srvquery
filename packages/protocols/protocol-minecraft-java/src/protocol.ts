import {
  type CreateHttpClientParams,
  QueryTimeoutError,
  QueryTransportError,
  defaultRetryOptions,
  defaultTimeout,
  type RetryOptions,
  withRetry,
} from "@srvquery/core";
import net from "node:net";
import { buildHandshakePacket, buildPingPacket, buildStatusRequestPacket } from "./packet/request";
import { MinecraftServerStatusSchema, type MinecraftServerStatus } from "./packet/schema";
import { decodeVarInt } from "./packet/varint";

/** Connection and retry settings used to create a Minecraft Java protocol client. */
export type CreateMinecraftJavaProtocolParams = Omit<CreateHttpClientParams, "port"> & {
  /** Minecraft Java Edition's default server port. */
  port?: number;
  /** Time in milliseconds to wait for a response to a single query attempt. */
  timeout?: number;
  /** Retry behavior for a query. */
  retry?: RetryOptions;
};

/** Default TCP port used by Minecraft Java Edition servers. */
export const defaultMinecraftJavaPort = 25565;

/** Query operations supported by the Minecraft Java Server List Ping protocol. */
export type MinecraftJavaProtocolRequestOpcode = "STATUS" | "PING";

type MinecraftJavaProtocolResponseMap = {
  STATUS: MinecraftServerStatus;
  PING: number;
};

/** Client for querying Minecraft Java Edition servers. */
export interface MinecraftJavaProtocol {
  /** Queries one Minecraft Java status opcode. */
  query<Opcode extends MinecraftJavaProtocolRequestOpcode>(params: {
    opcode: Opcode;
  }): Promise<MinecraftJavaProtocolResponseMap[Opcode]>;
}

const readPacket = ({
  socket,
  host,
  port,
  timeout,
}: {
  socket: net.Socket;
  host: string;
  port: number;
  timeout: number;
}): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    let buffered = Buffer.alloc(0);
    let packetLength: number | undefined;
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      if (error) reject(error);
      else resolve(buffered.subarray(0, packetLength));
    };

    const onData = (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk]);
      try {
        if (packetLength === undefined) {
          const length = decodeVarInt({ buffer: buffered });
          packetLength = length.value;
          buffered = buffered.subarray(length.bytes);
        }
        if (packetLength !== undefined && buffered.length >= packetLength) finish();
      } catch {
        // TCP can split the packet length VarInt across multiple chunks.
      }
    };

    const onError = (cause: unknown) =>
      finish(
        new QueryTransportError({
          message: `Failed to query Minecraft server ${host}:${port}`,
          cause,
        }),
      );
    const onClose = () =>
      finish(
        new QueryTransportError({
          message: `Minecraft server ${host}:${port} closed the connection before responding`,
          cause: undefined,
        }),
      );
    const timer = setTimeout(
      () => finish(new QueryTimeoutError({ host, port, attempts: 1 })),
      timeout,
    );

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });

const parseStatusPacket = (packet: Buffer): MinecraftServerStatus => {
  const packetId = decodeVarInt({ buffer: packet });
  if (packetId.value !== 0) {
    throw new Error(`Unexpected Minecraft status response packet id: ${packetId.value}`);
  }
  const stringLength = decodeVarInt({ buffer: packet, offset: packetId.bytes });
  const stringStart = packetId.bytes + stringLength.bytes;
  return MinecraftServerStatusSchema.parse(
    JSON.parse(packet.subarray(stringStart, stringStart + stringLength.value).toString("utf8")),
  );
};

/** Creates a client for querying a Minecraft Java Edition server. */
export const createMinecraftJavaProtocol = ({
  host,
  port = defaultMinecraftJavaPort,
  retry = defaultRetryOptions,
  timeout = defaultTimeout,
}: CreateMinecraftJavaProtocolParams): MinecraftJavaProtocol => {
  const queryAttempt = async <Opcode extends MinecraftJavaProtocolRequestOpcode>({
    opcode,
  }: {
    opcode: Opcode;
  }): Promise<MinecraftJavaProtocolResponseMap[Opcode]> => {
    const socket = net.createConnection({ host, port });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("error", reject);
      });
      socket.write(buildHandshakePacket({ host, port }));
      socket.write(buildStatusRequestPacket());
      const statusPacket = await readPacket({ socket, host, port, timeout });

      if (opcode === "STATUS")
        return parseStatusPacket(statusPacket) as MinecraftJavaProtocolResponseMap[Opcode];

      const startedAt = Date.now();
      const payload = BigInt(startedAt);
      socket.write(buildPingPacket({ payload });
      const pongPacket = await readPacket({ socket, host, port, timeout });
      const packetId = decodeVarInt({ buffer: pongPacket });
      if (packetId.value !== 1)
        throw new Error(`Unexpected Minecraft ping response packet id: ${packetId.value}`);
      const echoedPayload = pongPacket.readBigInt64BE(packetId.bytes);
      if (echoedPayload !== payload)
        throw new Error("Minecraft server returned an unexpected ping payload");
      return (Date.now() - startedAt) as MinecraftJavaProtocolResponseMap[Opcode];
    } catch (cause) {
      if (cause instanceof QueryTimeoutError || cause instanceof QueryTransportError) throw cause;
      throw new QueryTransportError({
        message: `Failed to query Minecraft server ${host}:${port}`,
        cause,
      });
    } finally {
      socket.destroy();
    }
  };

  const query = async <Opcode extends MinecraftJavaProtocolRequestOpcode>({
    opcode,
  }: {
    opcode: Opcode;
  }) =>
    withRetry(() => queryAttempt({ opcode }), retry) as Promise<
      MinecraftJavaProtocolResponseMap[Opcode]
    >;

  return { query };
};
