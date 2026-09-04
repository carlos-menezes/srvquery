import {
  BufferCursor,
  createUdpSocket,
  CreateUdpSocketOptions,
  CreateUdpSocketParams,
  UdpSocket,
} from "@srvquery/core";
import { randomBytes } from "node:crypto";
import { resolveIpv4 } from "./net/dns";
import { buildRequestPacket, packetHeaderLength } from "./packet/request";
import { OpenMPProtocolRequestOpcode } from "./packet/opcodes";
import {
  OpenMPPacketDeserializeFn,
  deserializeClientListPacket,
  deserializeInfoPacket,
  deserializePingPacket,
  deserializePlayersPacket,
  deserializeRulesPacket,
} from "./packet/serde";
import {
  OpenMPClientList,
  OpenMPPlayers,
  OpenMPRules,
  type OpenMPPing,
  type OpenMPServerInfo,
} from "./packet/schema";

export type CreateOpenMPProtocolParams = CreateUdpSocketParams & CreateUdpSocketOptions;

type OpenMPProtocolRequestParams<Opcode extends OpenMPProtocolRequestOpcode> = {
  opcode: Opcode;
};

type OpenMPProtocolQueryParams<Opcode extends OpenMPProtocolRequestOpcode> = {
  opcode: Opcode;
};

type OpenMPProtocolResponseMap = {
  INFO: OpenMPServerInfo;
  RULES: OpenMPRules;
  CLIENT_LIST: OpenMPClientList;
  PLAYERS: OpenMPPlayers;
  PING: OpenMPPing;
};

const deserializers = {
  INFO: deserializeInfoPacket,
  PING: deserializePingPacket,
  RULES: deserializeRulesPacket,
  CLIENT_LIST: deserializeClientListPacket,
  PLAYERS: deserializePlayersPacket,
} as const satisfies Record<OpenMPProtocolRequestOpcode, OpenMPPacketDeserializeFn>;

export const createOpenMPProtocol = ({
  host,
  port,
  ...socketOptions
}: CreateOpenMPProtocolParams) => {
  const ipv4 = resolveIpv4(host);

  async function _request<Opcode extends OpenMPProtocolRequestOpcode>(
    { opcode }: OpenMPProtocolRequestParams<Opcode>,
    socket: UdpSocket,
  ): Promise<Buffer> {
    const requestPacket = buildRequestPacket({
      opcode,
      ip: await ipv4,
      port,
    });

    let payload = requestPacket;

    if (opcode === "PING") {
      const extendedHeader = Buffer.allocUnsafe(packetHeaderLength + 4);
      requestPacket.copy(extendedHeader, 0, 0, packetHeaderLength);
      randomBytes(4).copy(extendedHeader, packetHeaderLength, 0, 4);
      payload = extendedHeader;
    }

    const [packet] = await socket.send(
      {
        payload,
      },
      {
        accept: (packet) => {
          const cursor = new BufferCursor(packet);
          const packetHeader = cursor.readBytes(packetHeaderLength);
          return packetHeader.equals(requestPacket);
        },
      },
    );

    return packet;
  }

  const query = async <Opcode extends OpenMPProtocolRequestOpcode>({
    opcode,
  }: OpenMPProtocolQueryParams<Opcode>): Promise<OpenMPProtocolResponseMap[Opcode]> => {
    using socket = createUdpSocket({ host, port }, socketOptions);
    const response = await _request({ opcode }, socket);
    const cursor = new BufferCursor(response);
    return deserializers[opcode](cursor) as OpenMPProtocolResponseMap[Opcode];
  };

  return {
    query,
  };
};

export type OpenMPProtocol = ReturnType<typeof createOpenMPProtocol>;
