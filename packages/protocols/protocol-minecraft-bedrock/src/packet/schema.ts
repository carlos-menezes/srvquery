import z from "zod";

/** Validates a Minecraft Bedrock server status response. */
export const MinecraftBedrockServerStatusSchema = z.object({
  edition: z.string(),
  motd: z.string(),
  protocol: z.coerce.number().int().nonnegative(),
  version: z.string(),
  onlinePlayers: z.coerce.number().int().nonnegative(),
  maxPlayers: z.coerce.number().int().nonnegative(),
  serverId: z.string(),
  map: z.string(),
  gameMode: z.string(),
  portV4: z.coerce.number().int().nonnegative(),
  portV6: z.coerce.number().int().nonnegative(),
});

/** Server status returned by a Minecraft Bedrock unconnected ping. */
export type MinecraftBedrockServerStatus = z.infer<typeof MinecraftBedrockServerStatusSchema>;
