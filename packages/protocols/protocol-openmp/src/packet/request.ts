import { OpenMPProtocolRequestOpcode, requestOpcodes } from "./opcodes";

/** Values encoded into an open.mp query request packet. */
export type BuildRequestPacketParams = {
  /** Query opcode to encode. */
  opcode: OpenMPProtocolRequestOpcode;
  /** Target IPv4 address embedded in the packet header. */
  ip: string;
  /** Target port embedded in little-endian order. */
  port: number;
};

/** Length in bytes of an open.mp query packet header. */
export const packetHeaderLength = 11;

/**
 * Builds a request packet for the OpenMP protocol.
 * @link https://open.mp/docs/tutorials/QueryMechanism#serialized-data
 *
 * @param param0 The parameters for building the packet header, including the opcode, IP address, and port number.
 * @returns A Buffer containing the request packet.
 */
export const buildRequestPacket = ({ opcode, ip, port }: BuildRequestPacketParams): Buffer => {
  const octets = ip.split(".").map((octet) => Number.parseInt(octet, 10));

  const header = Buffer.alloc(packetHeaderLength);
  header.write("SAMP", 0, "ascii");
  header.set(octets, 4);
  header.writeUInt8(port & 0xff, 8);
  header.writeUInt8((port >> 8) & 0xff, 9);
  header.writeUInt8(requestOpcodes[opcode], 10);
  return header;
};
