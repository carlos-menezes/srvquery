import { BufferCursor } from "@srvquery/core";
import z from "zod";
import {
  byte,
  readServerBrowserProtocolDlcs,
  readServerBrowserProtocolMods,
  readServerBrowserProtocolSignatures,
  reassembleServerBrowserProtocolMessage,
  ServerBrowserProtocolDlcSchema,
  ServerBrowserProtocolModSchema,
} from "./server-browser-protocol-reassembly";
import {
  TrailingServerBrowserProtocolDataError,
  UnsupportedServerBrowserProtocolVersionError,
} from "./errors";

/** Known DayZ DLC Steam app IDs, keyed by their bit in the DLC mask. */
const DAYZ_DLCS: Record<number, { appId: number; name: string }> = {
  0x1: { appId: 1151700, name: "Livonia" },
  0x2: { appId: 2968040, name: "Frost Line" },
  0x4: { appId: 3816030, name: "Badlands" },
  0x8: { appId: 830660, name: "Survivor GameZ" },
};

/** Validates the decoded "Server Message" body of a server browser protocol 2 (DayZ) response. */
export const ServerBrowserProtocol2MessageSchema = z.object({
  version: z.literal(2),
  // Purpose of these 8 bits is undocumented upstream.
  generalFlags: byte,
  dlcs: z.array(ServerBrowserProtocolDlcSchema),
  mods: z.array(ServerBrowserProtocolModSchema),
  signatures: z.array(z.string()),
  description: z.string(),
  extraRules: z.record(z.string(), z.string()),
});

/** Decoded "Server Message" body of a server browser protocol 2 (DayZ) response. */
export type ServerBrowserProtocol2Message = z.infer<typeof ServerBrowserProtocol2MessageSchema>;

/**
 * Parses a server browser protocol 2 (DayZ) `A2S_RULES` response: reassembles the paged, escaped
 * message from the rule pairs, then decodes its "Server Message" body.
 * @param cursor Cursor positioned at the first byte after the response opcode.
 */
export const serverBrowserProtocol2RulesParser = (
  cursor: BufferCursor,
): ServerBrowserProtocol2Message => {
  const { message, extraRules } = reassembleServerBrowserProtocolMessage(cursor);

  const version = message.readUInt8();
  if (version !== 2) {
    throw new UnsupportedServerBrowserProtocolVersionError({ version });
  }

  const generalFlags = message.readUInt8();
  const dlcMask = message.readUInt16LE();
  const dlcs = readServerBrowserProtocolDlcs(message, dlcMask, DAYZ_DLCS);
  const { mods } = readServerBrowserProtocolMods(message);
  const signatures = readServerBrowserProtocolSignatures(message);
  const description = new TextDecoder("utf-8", { fatal: true }).decode(
    message.readBytes(message.readUInt8()),
  );

  if (message.remaining !== 0) {
    throw new TrailingServerBrowserProtocolDataError({ remaining: message.remaining });
  }

  return ServerBrowserProtocol2MessageSchema.parse({
    version,
    generalFlags,
    dlcs,
    mods,
    signatures,
    description,
    extraRules,
  });
};
