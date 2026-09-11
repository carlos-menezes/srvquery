/** Encodes a signed Minecraft protocol VarInt. */
export const encodeVarInt = ({ value }: { value: number }): Buffer => {
  const bytes: number[] = [];
  let remaining = value | 0;

  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining !== 0);

  return Buffer.from(bytes);
};

/** Decodes a Minecraft protocol VarInt. */
export const decodeVarInt = ({
  buffer,
  offset = 0,
}: {
  buffer: Buffer;
  offset?: number;
}): { value: number; bytes: number } => {
  let value = 0;

  for (let index = 0; index < 5; index += 1) {
    const byte = buffer[offset + index];
    if (byte === undefined) throw new Error("Incomplete Minecraft VarInt");
    value |= (byte & 0x7f) << (index * 7);
    if ((byte & 0x80) === 0) return { value, bytes: index + 1 };
  }

  throw new Error("Minecraft VarInt is too long");
};

/** Prefixes a payload with its Minecraft packet length. */
export const framePacket = ({ payload }: { payload: Buffer }): Buffer =>
  Buffer.concat([encodeVarInt({ value: payload.length }), payload]);
