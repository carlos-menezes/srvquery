import {
  BufferCursor,
  createUdpSocket,
  CreateUdpSocketOptions,
  CreateUdpSocketParams,
  defaultRetryOptions,
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
import { serverBrowserProtocol3RulesParser } from "./rules/server-browser-protocol-3-parser";
import { type ValveRules } from "./rules/valve-rule-parser";

type ValveProtocolQueryResponseMap = {
  INFO: ValveServerInfo;
  SERVERQUERY_GETCHALLENGE: ValveChallenge;
  PLAYERS: ValvePlayers;
  PING: ValvePing;
  RULES: ValveRules;
};

/** Parameters for querying Valve rules with a game-specific parser. */
export type ValveRulesQueryParams<Result = ValveRules> = {
  /** Valve rules request opcode. */
  opcode: "RULES";
  /**
   * Parses the raw Valve rules response into a game-specific model.
   * In most cases, use the {@link valveRulesParser | default Valve rules parser}.
   *
   * @param cursor Cursor positioned at the first byte after the response opcode.
   * @returns The parsed game-specific rules model.
   */
  parser: (cursor: BufferCursor) => Result;
};

/** Parameters for querying a Valve opcode and optionally customizing RULES parsing. */
export type ValveProtocolQueryParams<
  Opcode extends ValveProtocolRequestOpcode,
  Result = ValveProtocolQueryResponseMap[Opcode],
> = Opcode extends "RULES"
  ? ValveRulesQueryParams<Result>
  : {
      /** Valve request opcode to query. */
      opcode: Opcode;
    };

/** Client for querying servers that implement the Valve server query protocol. */
export interface ValveProtocol {
  /** Queries one Valve opcode and resolves with its parsed response model. */
  query<Opcode extends ValveProtocolRequestOpcode, Result = ValveProtocolQueryResponseMap[Opcode]>(
    params: ValveProtocolQueryParams<Opcode, Result>,
  ): Promise<Result>;
}

const deserializers = {
  INFO: deserializeInfoPacket,
  SERVERQUERY_GETCHALLENGE: deserializeChallengePacket,
  PLAYERS: deserializePlayersPacket,
  PING: deserializePingPacket,
} as const satisfies Record<Exclude<ValveProtocolRequestOpcode, "RULES">, ValvePacketDeserializeFn>;

const queryResponseOpcodes = {
  INFO: responseOpcodes.INFO,
  SERVERQUERY_GETCHALLENGE: responseOpcodes.CHALLENGE,
  PLAYERS: responseOpcodes.PLAYERS,
  PING: responseOpcodes.PING,
  RULES: responseOpcodes.RULES,
} as const satisfies Record<ValveProtocolRequestOpcode, number>;

/** Connection and retry settings used to create a Valve protocol client. */
export type CreateValveProtocolParams = CreateUdpSocketParams & CreateUdpSocketOptions;

type ValveProtocolRequestParams = {
  opcode: ValveProtocolRequestOpcode;
  challenge?: number;
};

/**
 * Creates a client for querying servers that implement the Valve server query protocol.
 * @param params Target server and UDP transport settings.
 * @returns A client whose `query` method returns the response type for the requested opcode.
 */
export const createValveProtocol = ({
  host,
  port,
  retry = defaultRetryOptions,
  ...socketOptions
}: CreateValveProtocolParams): ValveProtocol => {
  async function request(socket: UdpSocket, params: ValveProtocolRequestParams): Promise<Buffer> {
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
      return request(socket, { opcode: params.opcode, challenge: responseChallenge });
    }

    return response;
  }

  const query = async <
    Opcode extends ValveProtocolRequestOpcode,
    Result = ValveProtocolQueryResponseMap[Opcode],
  >(
    params: ValveProtocolQueryParams<Opcode, Result>,
  ): Promise<Result> => {
    using socket = createUdpSocket({ host, port }, { ...socketOptions, retry });
    const response = await request(socket, { opcode: params.opcode });
    const cursor = new BufferCursor(response);
    const responseOpcode = cursor.readUInt8();
    if (responseOpcode !== queryResponseOpcodes[params.opcode]) {
      throw new Error(
        `Unexpected Valve response opcode: expected 0x${queryResponseOpcodes[params.opcode].toString(16).padStart(2, "0")}, got 0x${responseOpcode.toString(16).padStart(2, "0")}`,
      );
    }

    if (params.opcode !== "RULES") {
      return deserializers[params.opcode](cursor) as Result;
    }

    return params.parser(cursor);
  };

  return { query };
};

// console.log(
//   await createValveProtocol({
//     host: "193.25.252.15",
//     port: 27016,
//   }).query({ opcode: "RULES", parser: serverBrowserProtocol2RulesParser }),
// );

console.log(
  await createValveProtocol({
    host: "142.44.169.172",
    port: 2303,
  }).query({ opcode: "RULES", parser: serverBrowserProtocol3RulesParser }),
);
