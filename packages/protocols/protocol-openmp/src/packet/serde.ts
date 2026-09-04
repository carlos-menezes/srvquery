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
export type OpenMPPacketDeserializeFn = (cursor: BufferCursor) => unknown;

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
): OpenMPServerInfo => {
  skipHeader(cursor);
  const password = cursor.readUInt8();
  const players = cursor.readUInt16LE();
  const maxPlayers = cursor.readUInt16LE();
  const hostname = cursor.readBytes(cursor.readUInt32LE()).toString("utf8");
  const gamemode = cursor.readBytes(cursor.readUInt32LE()).toString("utf8");
  const language = cursor.readBytes(cursor.readUInt32LE()).toString("utf8");

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
): OpenMPRules => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();
  const rules: Record<string, string> = {};

  for (let index = 0; index < count; index += 1) {
    const name = cursor.readBytes(cursor.readUInt8()).toString("utf8");
    const value = cursor.readBytes(cursor.readUInt8()).toString("utf8");
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
export const deserializeClientListPacket = (cursor: BufferCursor): OpenMPClientList => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();

  const clients = Array.from({ length: count }, () => ({
    name: cursor.readBytes(cursor.readUInt8()).toString("utf8"),
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
): OpenMPPlayers => {
  skipHeader(cursor);
  const count = cursor.readUInt16LE();

  const players = Array.from({ length: count }, () => ({
    id: cursor.readUInt8(),
    name: cursor.readBytes(cursor.readUInt8()).toString("utf8"),
    score: cursor.readInt32LE(),
    ping: cursor.readUInt32LE(),
  }));

  return OpenMPPlayersSchema.parse(players);
};
