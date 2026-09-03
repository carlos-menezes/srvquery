import { ValveBinaryRuleSchema } from "@srvquery/protocol-valve";
import z from "zod";

const byte = z.number().int().min(0).max(0xff);
const uint16 = z.number().int().min(0).max(0xffff);
const uint32 = z.number().int().min(0).max(0xffffffff);

export const DayZDlcSchema = z.object({
  mask: uint16,
  appId: uint32.optional(),
  name: z.string(),
  hash: uint32,
});

export const DayZModSchema = z.object({
  id: z.bigint().nonnegative(),
  name: z.string(),
  hash: uint32,
});

export const DayZRulesSchema = z.object({
  protocol: z.literal(2),
  flags: byte,
  dlcs: z.array(DayZDlcSchema),
  mods: z.array(DayZModSchema),
  signatures: z.array(z.string()),
  description: z.string(),
  allowedBuild: uint16.optional(),
  clientPort: uint16.optional(),
  dedicated: z.boolean().optional(),
  island: z.string().optional(),
  language: uint32.optional(),
  platform: z.string().optional(),
  requiredBuild: uint16.optional(),
  requiredVersion: uint16.optional(),
  timeLeft: uint16.optional(),
  extraRules: z.record(z.string(), z.string()),
  extraBinaryRules: z.array(ValveBinaryRuleSchema),
});

export type DayZDlc = z.infer<typeof DayZDlcSchema>;
export type DayZMod = z.infer<typeof DayZModSchema>;
export type DayZRules = z.infer<typeof DayZRulesSchema>;
