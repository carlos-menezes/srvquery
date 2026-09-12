import {
  type CreateUdpSocketOptions,
  type CreateUdpSocketParams,
  createUdpSocket,
  defaultRetryOptions,
  defaultTimeout,
  type RetryOptions,
  type UdpSocket,
} from "@srvquery/core";
import {
  MinecraftBedrockServerStatusSchema,
  type MinecraftBedrockServerStatus,
} from "./packet/schema";
import { buildUnconnectedPingPacket } from "./packet/request";
import { parseUnconnectedPongPacket } from "./packet/response";

/** Default UDP port used by Minecraft Bedrock servers. */
export const defaultMinecraftBedrockPort = 19132;

/** Connection and retry settings used to create a Minecraft Bedrock client. */
export type CreateMinecraftBedrockProtocolParams = Omit<CreateUdpSocketParams, "port"> & {
  port?: number;
  retry?: RetryOptions;
} & Omit<CreateUdpSocketOptions, "retry">;

/** Query operations supported by Minecraft Bedrock. */
export type MinecraftBedrockProtocolRequestOpcode = "STATUS" | "PING";

type MinecraftBedrockResponseMap = {
  STATUS: MinecraftBedrockServerStatus;
  PING: number;
};

/** Client for querying Minecraft Bedrock servers directly over RakNet UDP. */
export interface MinecraftBedrockProtocol {
  query<Opcode extends MinecraftBedrockProtocolRequestOpcode>({
    opcode,
  }: {
    opcode: Opcode;
  }): Promise<MinecraftBedrockResponseMap[Opcode]>;
}

export const createMinecraftBedrockProtocol = ({
  host,
  port = defaultMinecraftBedrockPort,
  retry = defaultRetryOptions,
  timeout = defaultTimeout,
  ...socketOptions
}: CreateMinecraftBedrockProtocolParams): MinecraftBedrockProtocol => {
  const queryAttempt = async <Opcode extends MinecraftBedrockProtocolRequestOpcode>({
    opcode,
  }: {
    opcode: Opcode;
  }): Promise<MinecraftBedrockResponseMap[Opcode]> => {
    const socket: UdpSocket = createUdpSocket({ host, port }, { ...socketOptions, retry, timeout });
    const startedAt = Date.now();
    const timestamp = BigInt(startedAt);
    const payload = buildUnconnectedPingPacket({ timestamp });
    try {
      const [packet] = await socket.send(
        { payload },
        {
          accept: (response) =>
            response.length >= 9 &&
            response.readUInt8(0) === 0x1c &&
            response.readBigInt64BE(1) === timestamp,
        },
      );
      const status = MinecraftBedrockServerStatusSchema.parse(parseUnconnectedPongPacket(packet));
      if (opcode === "STATUS") return status as MinecraftBedrockResponseMap[Opcode];
      return (Date.now() - startedAt) as MinecraftBedrockResponseMap[Opcode];
    } finally {
      socket.close();
    }
  };

  const query = async <Opcode extends MinecraftBedrockProtocolRequestOpcode>({
    opcode,
  }: {
    opcode: Opcode;
  }) => queryAttempt({ opcode });

  return { query };
};
