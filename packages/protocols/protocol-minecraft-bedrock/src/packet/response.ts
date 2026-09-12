import { rakNetMagic } from "./request";

/** Parses a RakNet unconnected pong and its semicolon-delimited MOTD. */
export const parseUnconnectedPongPacket = (packet: Buffer) => {
  if (packet.length < 35 || packet.readUInt8(0) !== 0x1c) {
    throw new Error("Unexpected Minecraft Bedrock unconnected pong packet");
  }
  if (!packet.subarray(17, 33).equals(rakNetMagic)) {
    throw new Error("Invalid RakNet magic in Minecraft Bedrock pong packet");
  }
  const motdLength = packet.readUInt16BE(33);
  if (packet.length < 35 + motdLength) {
    throw new Error("Truncated Minecraft Bedrock server MOTD");
  }
  const motd = packet.subarray(35, 35 + motdLength).toString("utf8");
  const fields = motd.split(";");
  if (fields.length < 12) throw new Error("Invalid Minecraft Bedrock server MOTD");
  return {
    edition: fields[0],
    motd: fields[1],
    protocol: fields[2],
    version: fields[3],
    onlinePlayers: fields[4],
    maxPlayers: fields[5],
    serverId: fields[6],
    map: fields[7],
    gameMode: fields[8],
    portV4: fields[10],
    portV6: fields[11],
  };
};
