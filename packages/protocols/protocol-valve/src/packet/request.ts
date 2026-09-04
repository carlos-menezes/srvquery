import { requestOpcodes, ValveProtocolRequestOpcode } from "./opcodes";

/** Values encoded into a Valve server query request packet. */
export type BuildRequestPacketParams = {
  /** Query opcode to encode. */
  opcode: ValveProtocolRequestOpcode;
  /** Challenge token supplied for protected query types. */
  challenge?: number;
};

/**
 * Builds a Valve server query request packet.
 * @param params Opcode and optional challenge token to encode.
 * @returns Encoded request packet.
 * @link https://developer.valvesoftware.com/wiki/Server_queries#Requests
 */
export const buildRequestPacket = ({ opcode, challenge }: BuildRequestPacketParams): Buffer => {
  const chunks: number[] = [0xff, 0xff, 0xff, 0xff, requestOpcodes[opcode]];

  switch (opcode) {
    case "INFO": {
      chunks.push(..."Source Engine Query\0".split("").map((c) => c.charCodeAt(0)));
      break;
    }
    case "PLAYERS":
    case "RULES":
      challenge ??= -1;
      break;
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
