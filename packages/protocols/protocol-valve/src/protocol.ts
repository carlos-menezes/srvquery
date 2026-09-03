import { BufferCursor, UdpQuerySocket } from "@srvquery/core";
import {
  ValveChallengeSchema,
  ValvePingSchema,
  ValvePlayersSchema,
  ValveRulesSchema,
  ValveServerInfoSchema,
  type ValveChallenge,
  type ValvePing,
  type ValvePlayers,
  type ValveRules,
  type ValveServerInfo,
} from "./schema";

const SIMPLE_HEADER = -1;
const SPLIT_HEADER = -2;
const CHALLENGE_RESPONSE = 0x41;
const PLAYERS_RESPONSE = 0x44;
const RULES_RESPONSE = 0x45;
const INFO_RESPONSE = 0x49;
const PING_RESPONSE = 0x6a;

/**
 * Mapping of ValveProtocol query types to their corresponding request codes.
 * @link https://developer.valvesoftware.com/wiki/Server_queries#Requests
 */
const queryTypeMapping = {
  INFO: 84,
  PLAYERS: 85,
  RULES: 86,
  PING: 105,
  SERVERQUERY_GETCHALLENGE: 87,
};

export type ValveProtocolQueryType = keyof typeof queryTypeMapping;

export type ValveProtocolQueryResult = {
  INFO: ValveServerInfo;
  PLAYERS: ValvePlayers;
  RULES: ValveRules;
  PING: ValvePing;
  SERVERQUERY_GETCHALLENGE: ValveChallenge;
};

export type ValveProtocolRequestOptions<Query extends ValveProtocolQueryType> = {
  challenge?: number;
  query: Query;
};

export type ValveProtocolQueryOptions<Query extends ValveProtocolQueryType, Result> = {
  parser: (value: ValveProtocolQueryResult[Query]) => Result | Promise<Result>;
};

export type ValveProtocolOptions = {
  socket: UdpQuerySocket;
};

export type ValveProtocol = {
  query<Query extends ValveProtocolQueryType>(
    type: Query,
  ): Promise<ValveProtocolQueryResult[Query]>;
  query<Query extends ValveProtocolQueryType, Result>(
    type: Query,
    options: ValveProtocolQueryOptions<Query, Result>,
  ): Promise<Awaited<Result>>;
  request<Query extends ValveProtocolQueryType>(
    options: ValveProtocolRequestOptions<Query>,
  ): Promise<ValveProtocolQueryResult[Query]>;
};

export const createValveProtocol = ({ socket }: ValveProtocolOptions): ValveProtocol => {
  async function request<Query extends ValveProtocolQueryType>({
    query,
    challenge,
  }: ValveProtocolRequestOptions<Query>): Promise<ValveProtocolQueryResult[Query]> {
    const requestCode = queryTypeMapping[query];

    if (!requestCode) {
      throw new Error(`Unsupported query type: ${query}`);
    }

    const chunks: number[] = [0xff, 0xff, 0xff, 0xff, requestCode];
    switch (query) {
      case "INFO": {
        chunks.push(..."Valve Engine Query\0".split("").map((c) => c.charCodeAt(0)));
        break;
      }
      case "PLAYERS":
      case "RULES":
        challenge ??= -1;
        break;
      case "PING":
      case "SERVERQUERY_GETCHALLENGE":
        break;
    }

    if (challenge !== undefined) {
      const challengeBuffer = Buffer.allocUnsafe(4);
      challengeBuffer.writeInt32LE(challenge);
      chunks.push(...challengeBuffer);
    }

    const buffer = Buffer.from(chunks);
    const packets = await socket.send(buffer, {
      accept: (packet) => {
        const header = packet.readInt32LE(0);
        return header === SIMPLE_HEADER || header === SPLIT_HEADER;
      },
      end: (packets) => {
        const cursor = new BufferCursor(packets[0]);
        const header = cursor.readInt32LE();
        if (header === SIMPLE_HEADER) return true;
        cursor.skip(4); // id
        const total = cursor.readUInt8();
        return packets.length === total;
      },
    });

    const cursor = new BufferCursor(packets[0]);
    const header = cursor.readInt32LE();
    const body = header === SIMPLE_HEADER ? cursor.readRemaining() : reassemble(packets);

    const bodyCursor = new BufferCursor(body);
    if (bodyCursor.readUInt8() === CHALLENGE_RESPONSE) {
      const responseChallenge = ValveChallengeSchema.parse(bodyCursor.readInt32LE());
      if (query === "SERVERQUERY_GETCHALLENGE") {
        return responseChallenge as ValveProtocolQueryResult[Query];
      }
      return request({ query, challenge: responseChallenge });
    }

    return parseResponse(query, body);
  }

  function query<Query extends ValveProtocolQueryType>(
    type: Query,
  ): Promise<ValveProtocolQueryResult[Query]>;
  function query<Query extends ValveProtocolQueryType, Result>(
    type: Query,
    options: ValveProtocolQueryOptions<Query, Result>,
  ): Promise<Awaited<Result>>;
  async function query<Query extends ValveProtocolQueryType, Result>(
    type: Query,
    options?: ValveProtocolQueryOptions<Query, Result>,
  ): Promise<ValveProtocolQueryResult[Query] | Awaited<Result>> {
    const value = await request({ query: type });
    return options ? await options.parser(value) : value;
  }

  return {
    query,
    request,
  };
};

const parseResponse = <Query extends ValveProtocolQueryType>(
  query: Query,
  body: Buffer,
): ValveProtocolQueryResult[Query] => {
  switch (query) {
    case "INFO":
      return parseInfo(body) as ValveProtocolQueryResult[Query];
    case "PLAYERS":
      return parsePlayers(body) as ValveProtocolQueryResult[Query];
    case "RULES":
      return parseRules(body) as ValveProtocolQueryResult[Query];
    case "PING":
      return parsePing(body) as ValveProtocolQueryResult[Query];
    case "SERVERQUERY_GETCHALLENGE":
      throw new Error("Expected challenge response");
  }
};

const parseInfo = (body: Buffer): ValveServerInfo => {
  const cursor = new BufferCursor(body);

  if (cursor.readUInt8() !== INFO_RESPONSE) {
    throw new Error("Unexpected response type for A2S_INFO query");
  }

  const info: Record<string, unknown> = {
    protocol: cursor.readUInt8(),
    name: cursor.readCString(),
    map: cursor.readCString(),
    folder: cursor.readCString(),
    game: cursor.readCString(),
    appId: cursor.readUInt16LE(),
    players: cursor.readUInt8(),
    maxPlayers: cursor.readUInt8(),
    bots: cursor.readUInt8(),
  };

  const serverType = cursor.readUInt8();
  info.serverType = serverType === 0 ? 0 : String.fromCharCode(serverType);
  info.environment = String.fromCharCode(cursor.readUInt8());
  info.visibility = cursor.readUInt8();
  info.vac = cursor.readUInt8();

  if (info.appId === 2400) {
    info.shipMode = cursor.readUInt8();
    info.shipWitnesses = cursor.readUInt8();
    info.shipDuration = cursor.readUInt8();
  }

  info.version = cursor.readCString();

  if (cursor.remaining > 0) {
    const edf = cursor.readUInt8();
    info.edf = edf;
    if ((edf & 0x80) !== 0) info.port = cursor.readUInt16LE();
    if ((edf & 0x10) !== 0) info.steamId = cursor.readBigUInt64LE();
    if ((edf & 0x40) !== 0) {
      info.ValveTvPort = cursor.readUInt16LE();
      info.ValveTvName = cursor.readCString();
    }
    if ((edf & 0x20) !== 0) info.keywords = cursor.readCString();
    if ((edf & 0x01) !== 0) info.gameId = cursor.readBigUInt64LE();
  }

  return ValveServerInfoSchema.parse(info);
};

const parsePlayers = (body: Buffer): ValvePlayers => {
  const cursor = new BufferCursor(body);
  if (cursor.readUInt8() !== PLAYERS_RESPONSE) {
    throw new Error("Unexpected response type for A2S_PLAYER query");
  }

  const count = cursor.readUInt8();
  const players = Array.from({ length: count }, () => ({
    index: cursor.readUInt8(),
    name: cursor.readCString(),
    score: cursor.readInt32LE(),
    duration: cursor.readFloatLE(),
  }));
  return ValvePlayersSchema.parse(players);
};

const parseRules = (body: Buffer): ValveRules => {
  const cursor = new BufferCursor(body);
  if (cursor.readUInt8() !== RULES_RESPONSE) {
    throw new Error("Unexpected response type for A2S_RULES query");
  }

  const count = cursor.readUInt16LE();
  const rules: Record<string, string> = {};
  const binaryRules: Array<{ key: Buffer; value: Buffer }> = [];
  for (let index = 0; index < count; index += 1) {
    const key = readCStringBuffer(cursor);
    const value = readCStringBuffer(cursor);
    const textKey = decodeRuleText(key);
    const textValue = decodeRuleText(value);
    if (textKey === undefined || textValue === undefined) {
      binaryRules.push({ key, value });
    } else {
      rules[textKey] = textValue;
    }
  }

  return ValveRulesSchema.parse({ rules, binaryRules });
};

const readCStringBuffer = (cursor: BufferCursor): Buffer => {
  const terminator = cursor.buffer.indexOf(0, cursor.offset);
  if (terminator === -1) {
    throw new Error("Unterminated A2S_RULES string");
  }

  const value = cursor.buffer.subarray(cursor.offset, terminator);
  cursor.skip(value.length + 1);
  return value;
};

const decodeRuleText = (value: Buffer): string | undefined => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(value);
    return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ? undefined : text;
  } catch {
    return undefined;
  }
};

const parsePing = (body: Buffer): ValvePing => {
  const cursor = new BufferCursor(body);
  if (cursor.readUInt8() !== PING_RESPONSE) {
    throw new Error("Unexpected response type for A2A_PING query");
  }
  return ValvePingSchema.parse(true);
};

const reassemble = (packets: Buffer[]): Buffer => {
  const fragments = packets.map((packet) => {
    const cursor = new BufferCursor(packet);
    cursor.skip(9); // header + id + total
    const packetNumber = cursor.readUInt8();
    cursor.skip(2); // size
    return { packetNumber, data: cursor.readRemaining() };
  });

  fragments.sort((a, b) => a.packetNumber - b.packetNumber);
  return Buffer.concat(fragments.map((fragment) => fragment.data));
};
