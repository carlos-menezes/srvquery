import { requestOpcodes, ValveProtocolRequestOpcode } from "./opcodes";

export type BuildRequestPacketParams = {
  opcode: ValveProtocolRequestOpcode;
  challenge?: number;
};

/**
 * Builds a request packet for the OpenMP protocol.
 * @link https://open.mp/docs/tutorials/QueryMechanism#serialized-data
 *
 * @param param0 The parameters for building the packet header, including the opcode, IP address, and port number.
 * @returns A Buffer containing the request packet.
 */
export const buildRequestPacket = ({ opcode, challenge }: BuildRequestPacketParams): Buffer => {
  const chunks: number[] = [0xff, 0xff, 0xff, 0xff, requestOpcodes[opcode]];

  switch (opcode) {
    case "INFO": {
      chunks.push(..."Source Engine Query\0".split("").map((c) => c.charCodeAt(0)));
      break;
    }
    case "PLAYERS":
      challenge ??= -1;
      break;
    // case "RULES":
    //   challenge ??= -1;
    //   break;
    case "PING":
    case "SERVERQUERY_GETCHALLENGE":
      break;
  }

  if (challenge !== undefined) {
    chunks.push(
      challenge & 0xff,
      (challenge >> 8) & 0xff,
      (challenge >> 16) & 0xff,
      (challenge >> 24) & 0xff,
    );
  }

  return Buffer.from(chunks);
};
