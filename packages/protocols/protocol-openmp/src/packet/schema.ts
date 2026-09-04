import z from "zod";

const byte = z.number().int().min(0).max(0xff);
const word = z.number().int().min(0).max(0xffff);
const flag = z.union([z.literal(0), z.literal(1)]);

/** Validates an open.mp `INFO` response. */
export const OpenMPServerInfoSchema = z.object({
  password: flag,
  players: word,
  maxPlayers: word,
  hostname: z.string(),
  gamemode: z.string(),
  language: z.string(),
});

/** General server metadata returned by an open.mp `INFO` query. */
export type OpenMPServerInfo = z.infer<typeof OpenMPServerInfoSchema>;

/** Validates the string key-value map returned by an open.mp `RULES` query. */
export const OpenMPRulesSchema = z.record(z.string(), z.string());

/** Server rule names and values returned by an open.mp `RULES` query. */
export type OpenMPRules = z.infer<typeof OpenMPRulesSchema>;

/** Validates a compact client entry containing a name and score. */
export const OpenMPClientSchema = z.object({
  name: z.string(),
  score: z.number().int(),
});

/** Validates the compact client list returned by a `CLIENT_LIST` query. */
export const OpenMPClientListSchema = z.array(OpenMPClientSchema);

/** Compact open.mp client entry containing a name and score. */
export type OpenMPClient = z.infer<typeof OpenMPClientSchema>;
/** Compact client entries returned by an open.mp `CLIENT_LIST` query. */
export type OpenMPClientList = z.infer<typeof OpenMPClientListSchema>;

/** Validates a detailed open.mp player entry. */
export const OpenMPPlayerSchema = z.object({
  id: byte,
  name: z.string(),
  score: z.number().int(),
  ping: z.number().int().nonnegative(),
});

/** Validates the detailed player list returned by a `PLAYERS` query. */
export const OpenMPPlayersSchema = z.array(OpenMPPlayerSchema);

/** Detailed open.mp player entry containing an ID, name, score, and ping. */
export type OpenMPPlayer = z.infer<typeof OpenMPPlayerSchema>;
/** Detailed player entries returned by an open.mp `PLAYERS` query. */
export type OpenMPPlayers = z.infer<typeof OpenMPPlayersSchema>;

/** Validates the non-negative latency returned by an open.mp `PING` query. */
export const OpenMPPingSchema = z.number().nonnegative();

/** Round-trip latency in milliseconds returned by an open.mp `PING` query. */
export type OpenMPPing = z.infer<typeof OpenMPPingSchema>;
