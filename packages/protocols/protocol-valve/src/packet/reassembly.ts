import { BufferCursor } from "@srvquery/core";

/**
 * Reassembles fragmented packets into a single contiguous buffer.
 *
 * @param packets The fragmented packet buffers.
 * @returns The reassembled payload buffer.
 */
export const combineFragments = (packets: Buffer[]): Buffer => {
  const fragments = packets.map((packet) => {
    const packetNumber = packet.readUInt8(10);
    // size is 2 bytes
    const data = packet.subarray(13);
    return { packetNumber, data };
  });

  fragments.sort((a, b) => a.packetNumber - b.packetNumber);
  return Buffer.concat(fragments.map((fragment) => fragment.data));
};
