import z from "zod";

const byte = z.number().int().min(0).max(0xff);
const word = z.number().int().min(0).max(0xffff);
const flag = z.union([z.literal(0), z.literal(1)]);

export const OpenMPServerInfoSchema = z.object({
  password: flag,
  players: word,
  maxPlayers: word,
  hostname: z.string(),
  gamemode: z.string(),
  language: z.string(),
});

export type OpenMPServerInfo = z.infer<typeof OpenMPServerInfoSchema>;

export const OpenMPRulesSchema = z.record(z.string(), z.string());

export type OpenMPRules = z.infer<typeof OpenMPRulesSchema>;

export const OpenMPClientSchema = z.object({
  name: z.string(),
  score: z.number().int(),
});

export const OpenMPClientListSchema = z.array(OpenMPClientSchema);

export type OpenMPClient = z.infer<typeof OpenMPClientSchema>;
export type OpenMPClientList = z.infer<typeof OpenMPClientListSchema>;

export const OpenMPPlayerSchema = z.object({
  id: byte,
  name: z.string(),
  score: z.number().int(),
  ping: z.number().int().nonnegative(),
});

export const OpenMPPlayersSchema = z.array(OpenMPPlayerSchema);

export type OpenMPPlayer = z.infer<typeof OpenMPPlayerSchema>;
export type OpenMPPlayers = z.infer<typeof OpenMPPlayersSchema>;

export const OpenMPPingSchema = z.number().nonnegative();

export type OpenMPPing = z.infer<typeof OpenMPPingSchema>;
