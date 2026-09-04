import z from "zod";

const byte = z.number().int().min(0).max(0xff);
const short = z.number().int().min(0).max(0xffff);
const flag = z.union([z.literal(0), z.literal(1)]);
const int32 = z.number().int().min(-0x80000000).max(0x7fffffff);

export const ValveServerInfoSchema = z
  .object({
    protocol: byte,
    name: z.string(),
    map: z.string(),
    folder: z.string(),
    game: z.string(),
    appId: short,
    players: byte,
    maxPlayers: byte,
    bots: byte,
    serverType: z.union([z.enum(["d", "l", "p"]), z.literal(0)]),
    environment: z.enum(["l", "w", "m", "o"]),
    visibility: flag,
    vac: flag,
    shipMode: byte.optional(),
    shipWitnesses: byte.optional(),
    shipDuration: byte.optional(),
    version: z.string(),
    edf: byte.optional(),
    port: short.optional(),
    steamId: z.bigint().nonnegative().optional(),
    ValveTvPort: short.optional(),
    ValveTvName: z.string().optional(),
    keywords: z.string().optional(),
    gameId: z.bigint().nonnegative().optional(),
  })
  .superRefine((info, context) => {
    const requireFields = (condition: boolean, fields: (keyof typeof info)[]) => {
      for (const field of fields) {
        if (condition === (info[field] === undefined)) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: condition ? "Field is required" : "Field is not present in this response",
          });
        }
      }
    };

    requireFields(info.appId === 2400, ["shipMode", "shipWitnesses", "shipDuration"]);
    requireFields(info.edf !== undefined && (info.edf & 0x80) !== 0, ["port"]);
    requireFields(info.edf !== undefined && (info.edf & 0x10) !== 0, ["steamId"]);
    requireFields(info.edf !== undefined && (info.edf & 0x40) !== 0, [
      "ValveTvPort",
      "ValveTvName",
    ]);
    requireFields(info.edf !== undefined && (info.edf & 0x20) !== 0, ["keywords"]);
    requireFields(info.edf !== undefined && (info.edf & 0x01) !== 0, ["gameId"]);
  });

export type ValveServerInfo = z.infer<typeof ValveServerInfoSchema>;

export const ValvePlayerSchema = z.object({
  index: byte,
  name: z.string(),
  score: int32,
  duration: z.number().nonnegative(),
});

export const ValvePlayersSchema = z.array(ValvePlayerSchema);
export const ValveBinaryRuleSchema = z.object({
  key: z.instanceof(Buffer),
  value: z.instanceof(Buffer),
});
export const ValveRulesSchema = z.object({
  rules: z.record(z.string(), z.string()),
  binaryRules: z.array(ValveBinaryRuleSchema),
});
export const ValvePingSchema = z.object({
  payload: z.string(),
});
export const ValveChallengeSchema = int32;

export type ValvePlayer = z.infer<typeof ValvePlayerSchema>;
export type ValvePlayers = z.infer<typeof ValvePlayersSchema>;
export type ValveBinaryRule = z.infer<typeof ValveBinaryRuleSchema>;
export type ValveRules = z.infer<typeof ValveRulesSchema>;
export type ValvePing = z.infer<typeof ValvePingSchema>;
export type ValveChallenge = z.infer<typeof ValveChallengeSchema>;
