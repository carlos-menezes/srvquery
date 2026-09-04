import { BufferCursor } from "@srvquery/core";
import z from "zod";

/**
 * Deserializes a Valve rules packet from the given buffer cursor.
 * @param cursor The buffer cursor pointing to the start of the rules packet.
 * @returns The deserialized Valve rules array.
 */
export const valveRulesParser = (cursor: BufferCursor): ValveRules => {
  const ruleCount = cursor.readUInt16LE();
  const rules = Array.from({ length: ruleCount }, () => ({
    name: cursor.readCString(),
    value: cursor.readCString(),
  }));

  return ValveRulesSchema.parse(rules);
};

/** Validates decoded string rules from an `A2S_RULES` response. */
export const ValveRulesSchema = z.array(
  z.object({
    name: z.string(),
    value: z.string(),
  }),
);

/** String rules returned by a Valve `A2S_RULES` response. */
export type ValveRules = z.infer<typeof ValveRulesSchema>;
