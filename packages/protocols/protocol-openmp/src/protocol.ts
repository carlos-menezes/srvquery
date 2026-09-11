import {
  BufferCursor,
  createUdpSocket,
  CreateUdpSocketOptions,
  CreateUdpSocketParams,
  defaultRetryOptions,
  defaultTimeout,
  resolveIpv4,
  UdpSocket,
} from "@srvquery/core";
import { randomBytes } from "node:crypto";
import { buildRequestPacket, packetHeaderLength } from "./packet/request";
import { OpenMPProtocolRequestOpcode } from "./packet/opcodes";
import {
  OpenMPPacketDeserializeFn,
  deserializeClientListPacket,
  deserializeInfoPacket,
  deserializePingPacket,
  deserializePlayersPacket,
  deserializeRulesPacket,
  type OpenMPTextDecoder,
} from "./packet/serde";
import {
  OpenMPClientList,
  OpenMPPlayers,
  OpenMPRules,
  type OpenMPPing,
  type OpenMPServerInfo,
} from "./packet/schema";

/** Connection and retry settings used to create an open.mp protocol client. */
export type CreateOpenMPProtocolParams = CreateUdpSocketParams & CreateUdpSocketOptions;

type OpenMPProtocolRequestParams<Opcode extends OpenMPProtocolRequestOpcode> = {
  opcode: Opcode;
};

type OpenMPRequestResult = {
  packet: Buffer;
  ping?: { payload: number; startedAt: number };
};

type OpenMPProtocolQueryParams<Opcode extends OpenMPProtocolRequestOpcode> = {
  opcode: Opcode;
  /** Decodes text fields returned by the server. Defaults to UTF-8. */
  decodeText?: OpenMPTextDecoder;
};

type OpenMPProtocolResponseMap = {
  INFO: OpenMPServerInfo;
  RULES: OpenMPRules;
  CLIENT_LIST: OpenMPClientList;
  PLAYERS: OpenMPPlayers;
  PING: OpenMPPing;
};

/** Client for querying SA-MP and open.mp servers. */
export interface OpenMPProtocol {
  /** Queries one open.mp opcode and resolves with its corresponding response model. */
  query<Opcode extends OpenMPProtocolRequestOpcode>(
    params: OpenMPProtocolQueryParams<Opcode>,
  ): Promise<OpenMPProtocolResponseMap[Opcode]>;
}

const deserializers = {
  INFO: deserializeInfoPacket,
  PING: deserializePingPacket,
  RULES: deserializeRulesPacket,
  CLIENT_LIST: deserializeClientListPacket,
  PLAYERS: deserializePlayersPacket,
} as const satisfies Record<OpenMPProtocolRequestOpcode, OpenMPPacketDeserializeFn>;

/**
 * Creates a client for querying SA-MP and open.mp servers.
 * @param params Target server and UDP transport settings.
 * @returns A client whose `query` method returns the response type for the requested opcode.
 */
export const createOpenMPProtocol = ({
  host,
  port,
  retry = defaultRetryOptions,
  timeout = defaultTimeout,
  ...socketOptions
}: CreateOpenMPProtocolParams): OpenMPProtocol => {
  const ipv4 = resolveIpv4(host);
  async function request<Opcode extends OpenMPProtocolRequestOpcode>({
    opcode,
    socket,
  }: OpenMPProtocolRequestParams<Opcode> & { socket: UdpSocket }): Promise<OpenMPRequestResult> {
    const requestPacket = buildRequestPacket({
      opcode,
      ip: await ipv4,
      port,
    });

    let payload = requestPacket;
    let ping: OpenMPRequestResult["ping"];

    if (opcode === "PING") {
      const startedAt = Date.now();
      const pingPayload = randomBytes(4).readUInt32LE();
      const extendedHeader = Buffer.allocUnsafe(packetHeaderLength + 4);
      requestPacket.copy(extendedHeader, 0, 0, packetHeaderLength);
      extendedHeader.writeUInt32LE(pingPayload, packetHeaderLength);
      payload = extendedHeader;
      ping = { payload: pingPayload, startedAt };
    }

    const [packet] = await socket.send(
      {
        payload,
      },
      {
        accept: (packet) => {
          if (packet.length < packetHeaderLength) return false;
          const cursor = new BufferCursor(packet);
          const packetHeader = cursor.readBytes(packetHeaderLength);
          return packetHeader.equals(requestPacket);
        },
      },
    );

    return { packet, ping };
  }

  const query = async <Opcode extends OpenMPProtocolRequestOpcode>({
    opcode,
    decodeText,
  }: OpenMPProtocolQueryParams<Opcode>): Promise<OpenMPProtocolResponseMap[Opcode]> => {
    using socket = createUdpSocket({ host, port }, { ...socketOptions, retry, timeout });
    const { packet, ping } = await request({ opcode, socket });
    const cursor = new BufferCursor(packet);
    const result = deserializers[opcode](
      cursor,
      decodeText ?? ((buffer) => buffer.toString("utf8")),
    ) as OpenMPProtocolResponseMap[Opcode];
    if (opcode === "PING") {
      if (result !== ping?.payload)
        throw new Error("open.mp server returned an unexpected ping payload");
      return (Date.now() - (ping?.startedAt ?? Date.now())) as OpenMPProtocolResponseMap[Opcode];
    }
    return result;
  };

  return {
    query,
  };
};
