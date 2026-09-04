import {
  BufferCursor,
  createUdpSocket,
  CreateUdpSocketOptions,
  CreateUdpSocketParams,
  UdpSocket,
} from "@srvquery/core";
import { responseOpcodes, responseTypeOpcodes, ValveProtocolRequestOpcode } from "./packet/opcodes";
import { combineFragments } from "./packet/reassembly";
import { buildRequestPacket } from "./packet/request";
import {
  ValveChallenge,
  ValveChallengeSchema,
  ValvePing,
  ValvePlayers,
  ValveServerInfo,
} from "./packet/schema";
import {
  deserializeChallengePacket,
  deserializeInfoPacket,
  deserializePingPacket,
  deserializePlayersPacket,
  ValvePacketDeserializeFn,
} from "./packet/serde";

type ValveProtocolQueryParams<Opcode extends ValveProtocolRequestOpcode> = {
  opcode: Opcode;
};

type ValveProtocolQueryResponseMap = {
  INFO: ValveServerInfo;
  SERVERQUERY_GETCHALLENGE: ValveChallenge;
  PLAYERS: ValvePlayers;
  PING: ValvePing;
};

const deserializers = {
  INFO: deserializeInfoPacket,
  SERVERQUERY_GETCHALLENGE: deserializeChallengePacket,
  PLAYERS: deserializePlayersPacket,
  PING: deserializePingPacket,
} as const satisfies Record<ValveProtocolRequestOpcode, ValvePacketDeserializeFn>;

export type CreateValveProtocolParams = CreateUdpSocketParams & CreateUdpSocketOptions;

type ValveProtocolRequestParams = {
  opcode: ValveProtocolRequestOpcode;
  challenge?: number;
};

export const createValveProtocol = ({
  host,
  port,
  ...socketOptions
}: CreateValveProtocolParams) => {
  async function _request(socket: UdpSocket, params: ValveProtocolRequestParams): Promise<Buffer> {
    const payload = buildRequestPacket(params);
    const packets = await socket.send(
      { payload },
      {
        accept: (packet) => {
          const responseFormat = packet.readInt32LE(0);
          return (
            responseFormat === responseTypeOpcodes.SIMPLE ||
            responseFormat === responseTypeOpcodes.MULTI
          );
        },
        end: (packets) => {
          const header = packets[0].readInt32LE(0);
          if (header === responseTypeOpcodes.SIMPLE) return true;

          const total = packets[0].readUInt8(8); // after header (4) + id (4)

          const numbers = new Set(
            packets.map((packet) => packet.readUInt8(9)), // after header + id + total
          );
          return numbers.size === total;
        },
      },
    );

    const firstPacketResponseType = packets[0].readInt32LE(0);
    const response =
      firstPacketResponseType === responseTypeOpcodes.SIMPLE
        ? packets[0].subarray(4)
        : combineFragments(packets);
    const responseCursor = new BufferCursor(response);
    const responseOpcode = responseCursor.readUInt8();

    if (responseOpcode === responseOpcodes.CHALLENGE) {
      const responseChallenge = ValveChallengeSchema.parse(responseCursor.readInt32LE());
      if (params.opcode === "SERVERQUERY_GETCHALLENGE") {
        return response;
      }
      return _request(socket, { opcode: params.opcode, challenge: responseChallenge });
    }

    return response;
  }

  const query = async <Opcode extends ValveProtocolRequestOpcode>(
    params: ValveProtocolQueryParams<Opcode>,
  ): Promise<ValveProtocolQueryResponseMap[Opcode]> => {
    using socket = createUdpSocket({ host, port }, socketOptions);
    const response = await _request(socket, { opcode: params.opcode });
    const cursor = new BufferCursor(response);
    return deserializers[params.opcode](cursor) as ValveProtocolQueryResponseMap[Opcode];
  };

  return { query };
};

export type ValveProtocol = ReturnType<typeof createValveProtocol>;

const protocol = createValveProtocol({ host: "193.25.252.15", port: 27016 });

console.dir(
  await Promise.allSettled([
    protocol.query({
      opcode: "INFO",
    }),
    protocol.query({
      opcode: "SERVERQUERY_GETCHALLENGE",
    }),
    protocol.query({
      opcode: "PLAYERS",
    }),
    protocol.query({
      opcode: "PING",
    }),
  ]),
  { depth: null },
);
