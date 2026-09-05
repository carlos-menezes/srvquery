import z from "zod";

/** Validates the `vars` map returned by a FiveM/RedM `info.json` query. */
export const FiveMVarsSchema = z.record(z.string(), z.string());

/** Convar-style key/value pairs (`sv_hostname`, `sv_maxClients`, ...) reported by the server. */
export type FiveMVars = z.infer<typeof FiveMVarsSchema>;

/** Validates a FiveM/RedM `info.json` response. */
export const FiveMServerInfoSchema = z.object({
  version: z.number().int(),
  icon: z.string().optional(),
  vars: FiveMVarsSchema.optional(),
  resources: z.array(z.string()),
  server: z.string(),
});

/** General server metadata, resources and convars returned by an `INFO` query. */
export type FiveMServerInfo = z.infer<typeof FiveMServerInfoSchema>;

/** Validates a single connected player entry returned by a `players.json` query. */
export const FiveMPlayerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  ping: z.number().int().nonnegative(),
  identifiers: z.array(z.string()),
  endpoint: z.string().optional(),
});

/** Validates the player list returned by a FiveM/RedM `players.json` query. */
export const FiveMPlayersSchema = z.array(FiveMPlayerSchema);

/** Connected player entry containing an ID, name, ping and identifiers. */
export type FiveMPlayer = z.infer<typeof FiveMPlayerSchema>;
/** Connected player entries returned by a FiveM/RedM `PLAYERS` query. */
export type FiveMPlayers = z.infer<typeof FiveMPlayersSchema>;

/** Validates a FiveM/RedM `dynamic.json` response. */
export const FiveMDynamicSchema = z.object({
  hostname: z.string(),
  gametype: z.string(),
  mapname: z.string(),
  clients: z.coerce.number().int().nonnegative(),
  sv_maxclients: z.coerce.number().int().nonnegative(),
  iv: z.union([z.string(), z.number()]).optional(),
});

/** Lightweight, server-browser-oriented summary returned by a `DYNAMIC` query. */
export type FiveMDynamic = z.infer<typeof FiveMDynamicSchema>;
