/**
 * Valve protocol query opcodes.
 * @link https://developer.valvesoftware.com/wiki/Server_queries#Requests
 */
export const requestOpcodes = {
  INFO: 84,
  PLAYERS: 85,
  // RULES: 86,
  PING: 105,
  SERVERQUERY_GETCHALLENGE: 87,
} as const;

export type ValveProtocolRequestOpcode = keyof typeof requestOpcodes;
export type ValveProtocolRequestOpcodeValue = (typeof requestOpcodes)[keyof typeof requestOpcodes];

export const responseTypeOpcodes = {
  SIMPLE: -1,
  MULTI: -2,
} as const;

export type ValveProtocolResponseTypeOpcode = keyof typeof responseTypeOpcodes;
export type ValveProtocolResponseTypeOpcodeValue =
  (typeof responseTypeOpcodes)[keyof typeof responseTypeOpcodes];

export const responseOpcodes = {
  CHALLENGE: 0x41,
} as const;

export type ValveProtocolResponseOpcode = keyof typeof responseOpcodes;
export type ValveProtocolResponseOpcodeValue =
  (typeof responseOpcodes)[keyof typeof responseOpcodes];
