import z from "zod";

/** Validates the version information returned by a Minecraft status query. */
export const MinecraftVersionSchema = z.object({ name: z.string(), protocol: z.number().int() });

/** A sample player returned by a Minecraft status query. */
export const MinecraftPlayerSchema = z.object({ name: z.string(), id: z.string() });

/** Validates the player counts and optional samples in a Minecraft status response. */
export const MinecraftPlayersSchema = z.object({
  max: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(),
  sample: z.array(MinecraftPlayerSchema).optional(),
});

/** Validates a Minecraft status description, which may be plain text or a chat component. */
export const MinecraftDescriptionSchema = z.union([z.string(), z.record(z.string(), z.unknown())]);

/** Validates the response to a Minecraft Java Server List Ping status request. */
export const MinecraftServerStatusSchema = z.object({
  version: MinecraftVersionSchema,
  players: MinecraftPlayersSchema,
  description: MinecraftDescriptionSchema,
  favicon: z.string().optional(),
  enforcesSecureChat: z.boolean().optional(),
  previewsChat: z.boolean().optional(),
});

export type MinecraftVersion = z.infer<typeof MinecraftVersionSchema>;
export type MinecraftPlayer = z.infer<typeof MinecraftPlayerSchema>;
export type MinecraftPlayers = z.infer<typeof MinecraftPlayersSchema>;
export type MinecraftDescription = z.infer<typeof MinecraftDescriptionSchema>;
export type MinecraftServerStatus = z.infer<typeof MinecraftServerStatusSchema>;
