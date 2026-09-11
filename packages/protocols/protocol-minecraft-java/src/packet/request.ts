import { encodeVarInt, framePacket } from "./varint";

const writeString = ({ value }: { value: string }): Buffer => {
  const bytes = Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarInt({ value: bytes.length }), bytes]);
};

/** Builds the Java Edition status handshake packet. */
export const buildHandshakePacket = ({ host, port }: { host: string; port: number }): Buffer =>
  framePacket({
    payload: Buffer.concat([
      encodeVarInt({ value: 0 }),
      encodeVarInt({ value: -1 }),
      writeString({ value: host }),
      Buffer.from([port >> 8, port & 0xff]),
      encodeVarInt({ value: 1 }),
    ]),
  });

/** Builds a Java Edition status request packet. */
export const buildStatusRequestPacket = (): Buffer =>
  framePacket({ payload: encodeVarInt({ value: 0 }) });

/** Builds a Java Edition ping packet. */
export const buildPingPacket = ({ payload }: { payload: bigint }): Buffer => {
  const value = Buffer.alloc(8);
  value.writeBigInt64BE(payload);
  return framePacket({ payload: Buffer.concat([encodeVarInt({ value: 1 }), value]) });
};
