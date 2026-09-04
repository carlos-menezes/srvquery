import { BufferCursor } from "@srvquery/core";
import {
  ValveChallengeSchema,
  ValvePing,
  ValvePingSchema,
  ValvePlayers,
  ValvePlayersSchema,
  ValveServerInfo,
  ValveServerInfoSchema,
} from "./schema";

export type ValvePacketDeserializeFn = (cursor: BufferCursor) => unknown;

const skipHeader = (cursor: BufferCursor) => {
  cursor.readUInt8(); // Skip the header byte
};

/**
 * Deserializes a Valve server info packet from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the start of the server info packet.
 * @returns The deserialized Valve server info object.
 */
export const deserializeInfoPacket = (cursor: BufferCursor): ValveServerInfo => {
  skipHeader(cursor);

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

  // handle The Ship
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

/**
 * Deserializes a Valve players packet from the given buffer.
 *
 * @param body The buffer containing the players packet.
 * @returns The deserialized Valve players object.
 */
export const deserializePlayersPacket = (cursor: BufferCursor): ValvePlayers => {
  skipHeader(cursor);

  const count = cursor.readUInt8();
  const players = Array.from({ length: count }, () => ({
    index: cursor.readUInt8(),
    name: cursor.readCString(),
    score: cursor.readInt32LE(),
    duration: cursor.readFloatLE(),
  }));
  return ValvePlayersSchema.parse(players);
};

/**
 * Deserializes a Valve challenge packet from the given buffer cursor.
 *
 * @param cursor The buffer cursor pointing to the start of the challenge packet.
 * @returns The deserialized challenge number.
 */
export const deserializeChallengePacket = (cursor: BufferCursor): number => {
  skipHeader(cursor);
  return ValveChallengeSchema.parse(cursor.readInt32LE());
};

export const deserializePingPacket = (cursor: BufferCursor): ValvePing => {
  skipHeader(cursor);
  return ValvePingSchema.parse({ payload: cursor.readCString() });
};
