/**
 * OpenMP protocol request opcodes.
 * @link https://open.mp/docs/tutorials/QueryMechanism#opcode
 */
export const requestOpcodes = {
  INFO: 105,
  RULES: 114,
  CLIENT_LIST: 99,
  PLAYERS: 100,
  PING: 112,
} as const;

/** Symbolic opcode accepted by an open.mp query. */
export type OpenMPProtocolRequestOpcode = keyof typeof requestOpcodes;
/** Numeric wire value for an open.mp request opcode. */
export type OpenMPProtocolRequestOpcodeValue = (typeof requestOpcodes)[keyof typeof requestOpcodes];
