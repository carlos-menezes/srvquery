/**
 * Valve protocol query opcodes.
 * @link https://developer.valvesoftware.com/wiki/Server_queries#Requests
 */
export const requestOpcodes = {
  INFO: 84,
  PLAYERS: 85,
  RULES: 86,
  PING: 105,
  SERVERQUERY_GETCHALLENGE: 87,
} as const;

/** Symbolic opcode accepted by a Valve server query. */
export type ValveProtocolRequestOpcode = keyof typeof requestOpcodes;
/** Numeric wire value for a Valve request opcode. */
export type ValveProtocolRequestOpcodeValue = (typeof requestOpcodes)[keyof typeof requestOpcodes];

/** Header values that identify simple and fragmented Valve responses. */
export const responseTypeOpcodes = {
  SIMPLE: -1,
  MULTI: -2,
} as const;

/** Symbolic name for a Valve response packet format. */
export type ValveProtocolResponseTypeOpcode = keyof typeof responseTypeOpcodes;
/** Numeric header value for a Valve response packet format. */
export type ValveProtocolResponseTypeOpcodeValue =
  (typeof responseTypeOpcodes)[keyof typeof responseTypeOpcodes];

/** Recognized Valve response payload opcodes. */
export const responseOpcodes = {
  CHALLENGE: 0x41,
  INFO: 0x49,
  PLAYERS: 0x44,
  RULES: 0x45,
  PING: 0x6a,
} as const;

/** Symbolic opcode for a recognized Valve response payload. */
export type ValveProtocolResponseOpcode = keyof typeof responseOpcodes;
/** Numeric wire value for a recognized Valve response payload opcode. */
export type ValveProtocolResponseOpcodeValue =
  (typeof responseOpcodes)[keyof typeof responseOpcodes];
