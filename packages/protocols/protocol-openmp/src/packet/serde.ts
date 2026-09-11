import { BufferCursor } from "@srvquery/core";
import {
  OpenMPClientList,
  OpenMPClientListSchema,
  OpenMPPing,
  OpenMPPlayers,
  OpenMPPlayersSchema,
  OpenMPRules,
  OpenMPRulesSchema,
  OpenMPServerInfo,
  OpenMPServerInfoSchema,
} from "./schema";
import { packetHeaderLength } from "./request";

/** Deserializes an open.mp response from a cursor positioned at its packet header. */
export type OpenMPTextDecoder = (buffer: Buffer) => string;
export type OpenMPPacketDeserializeFn = (
  cursor: BufferCursor,
  decodeText: OpenMPTextDecoder,
) => unknown;

const utf8: OpenMPTextDecoder = (buffer) => buffer.toString("utf8");

const skipHeader = (cursor: BufferCursor) => {
  // the header is just the verbatim request, skip
  cursor.skip(packetHeaderLength);
};

/**
 * Parses the server info from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the server info data.
 * @returns The parsed server info object.
 */
export const deserializeInfoPacket: OpenMPPacketDeserializeFn = (
  cursor: BufferCursor,
  decodeText = utf8,
): OpenMPServerInfo => {
  skipHeader(cursor);
  const password = cursor.readUInt8();
  const players = cursor.readUInt16LE();
  const maxPlayers = cursor.readUInt16LE();
  const hostname = decodeText(cursor.readBytes(cursor.readUInt32LE()));
  const gamemode = decodeText(cursor.readBytes(cursor.readUInt32LE()));
  const language = decodeText(cursor.readBytes(cursor.readUInt32LE()));

  return OpenMPServerInfoSchema.parse({
    password,
    players,
    maxPlayers,
    hostname,
    gamemode,
    language,
  }) as OpenMPServerInfo;
};

/**
 * Parses the ping value from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the ping data.
 * @returns The parsed ping value as an OpenMPPing object.
 */
export const deserializePingPacket: OpenMPPacketDeserializeFn = (
  cursor: BufferCursor,
): OpenMPPing => {
  skipHeader(cursor);
  return cursor.readUInt32LE();
};

/**
 * Parses the server rules from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the rules data.
 * @returns The parsed rules object as an OpenMPRules instance.
 */
export const deserializeRulesPacket: OpenMPPacketDeserializeFn = (
  cursor: BufferCursor,
  decodeText = utf8,
): OpenMPRules => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();
  const rules: Record<string, string> = {};

  for (let index = 0; index < count; index += 1) {
    const name = decodeText(cursor.readBytes(cursor.readUInt8()));
    const value = decodeText(cursor.readBytes(cursor.readUInt8()));
    rules[name] = value;
  }

  return OpenMPRulesSchema.parse(rules);
};

/**
 * Parses the client list from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the client list data.
 * @returns The parsed client list as an OpenMPClientList object.
 */
export const deserializeClientListPacket: OpenMPPacketDeserializeFn = (
  cursor,
  decodeText = utf8,
): OpenMPClientList => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();

  const clients = Array.from({ length: count }, () => ({
    name: decodeText(cursor.readBytes(cursor.readUInt8())),
    score: cursor.readInt32LE(),
  }));

  return OpenMPClientListSchema.parse(clients);
};

/**
 * Parses the list of players from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the players data.
 * @returns The parsed players list as an OpenMPPlayers object.
 */
export const deserializePlayersPacket: OpenMPPacketDeserializeFn = (
  cursor: BufferCursor,
  decodeText = utf8,
): OpenMPPlayers => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();

  const players = Array.from({ length: count }, () => ({
    id: cursor.readUInt8(),
    name: decodeText(cursor.readBytes(cursor.readUInt8())),
    score: cursor.readInt32LE(),
    ping: cursor.readUInt32LE(),
  }));

  return OpenMPPlayersSchema.parse(players);
};
