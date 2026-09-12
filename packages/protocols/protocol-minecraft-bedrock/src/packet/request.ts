import { randomBytes } from "node:crypto";

/** RakNet magic used by unconnected ping packets. */
export const rakNetMagic = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");

/** Builds a Minecraft Bedrock/RakNet unconnected ping packet. */
export const buildUnconnectedPingPacket = ({
  timestamp,
  clientGuid = randomBytes(8),
}: {
  timestamp: bigint;
  clientGuid?: Buffer;
}): Buffer => {
  if (clientGuid.length !== 8) throw new RangeError("RakNet client GUID must be 8 bytes");
  const packet = Buffer.alloc(1 + 8 + rakNetMagic.length + 8);
  packet.writeUInt8(0x01, 0);
  packet.writeBigInt64BE(timestamp, 1);
  rakNetMagic.copy(packet, 9);
  clientGuid.copy(packet, 25);
  return packet;
};
