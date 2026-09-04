import { BufferCursor } from "@srvquery/core";
import z from "zod";
import {
  byte,
  readServerBrowserProtocolDlcs,
  readServerBrowserProtocolMods,
  readServerBrowserProtocolSignatures,
  reassembleServerBrowserProtocolMessage,
  ServerBrowserProtocolCreatorDlcSchema,
  ServerBrowserProtocolDlcSchema,
  ServerBrowserProtocolModSchema,
} from "./server-browser-protocol-reassembly";
import {
  TrailingServerBrowserProtocolDataError,
  UnsupportedServerBrowserProtocolVersionError,
} from "./errors";

/** Known Arma 3 DLC Steam app IDs, keyed by their bit in the DLC mask. */
const ARMA3_DLCS: Record<number, { appId: number; name: string }> = {
  0x1: { appId: 288520, name: "Karts" },
  0x2: { appId: 332350, name: "Marksmen" },
  0x4: { appId: 304380, name: "Helicopters" },
  0x8: { appId: 275700, name: "Zeus" },
  0x10: { appId: 395180, name: "Apex" },
  0x20: { appId: 601670, name: "Jets" },
  0x40: { appId: 571710, name: "Laws of War" },
  0x80: { appId: 639600, name: "Malden" },
  0x100: { appId: 744950, name: "Tac-Ops Mission Pack" },
  0x200: { appId: 798390, name: "Tanks" },
  0x400: { appId: 1021790, name: "Enoch" },
  0x800: { appId: 1021790, name: "Contact (Platform)" },
  0x1000: { appId: 1325500, name: "Art of War" },
};

/** Known Arma 3 Creator DLC Steam app IDs, encoded as mods with an ID length of 19. */
const ARMA3_CREATOR_DLCS: Record<number, string> = {
  1042220: "Creator DLC: Global Mobilization - Cold War Germany",
  1175380: "Creator DLC: Spearhead 1944",
  1227700: "Creator DLC: S.O.G. Prairie Fire",
  1294440: "Creator DLC: CSLA Iron Curtain",
  1681170: "Creator DLC: Western Sahara",
  2647760: "Creator DLC: Reaction Forces",
  2647830: "Creator DLC: Expeditionary Forces",
};

/** Validates the difficulty settings carried by a server browser protocol 3 message. */
export const ServerBrowserProtocol3DifficultySchema = z.object({
  level: byte,
  aiLevel: byte,
  advancedFlightModel: z.boolean(),
  thirdPersonCamera: z.boolean(),
  weaponCrosshair: z.boolean(),
});

/** Validates the decoded "Server Message" body of a server browser protocol 3 (Arma 3) response. */
export const ServerBrowserProtocol3MessageSchema = z.object({
  version: z.literal(3),
  // Purpose of these 8 bits is undocumented upstream.
  generalFlags: byte,
  dlcs: z.array(ServerBrowserProtocolDlcSchema),
  difficulty: ServerBrowserProtocol3DifficultySchema,
  mods: z.array(ServerBrowserProtocolModSchema),
  creatorDlcs: z.array(ServerBrowserProtocolCreatorDlcSchema),
  signatures: z.array(z.string()),
  extraRules: z.record(z.string(), z.string()),
});

/** Decoded "Server Message" body of a server browser protocol 3 (Arma 3) response. */
export type ServerBrowserProtocol3Message = z.infer<typeof ServerBrowserProtocol3MessageSchema>;

/**
 * Parses a server browser protocol 3 (Arma 3) `A2S_RULES` response: reassembles the paged,
 * escaped message from the rule pairs, then decodes its "Server Message" body.
 * @param cursor Cursor positioned at the first byte after the response opcode.
 */
export const serverBrowserProtocol3RulesParser = (
  cursor: BufferCursor,
): ServerBrowserProtocol3Message => {
  const { message, extraRules } = reassembleServerBrowserProtocolMessage(cursor);

  const version = message.readUInt8();
  if (version !== 3) {
    throw new UnsupportedServerBrowserProtocolVersionError({ version });
  }

  const generalFlags = message.readUInt8();
  const dlcMask = message.readUInt16LE();

  const difficultyByte = message.readUInt8();
  const difficulty = {
    level: difficultyByte & 0b0000_0111,
    aiLevel: (difficultyByte >> 3) & 0b0000_0111,
    advancedFlightModel: (difficultyByte & (1 << 6)) === 0,
    thirdPersonCamera: (difficultyByte & (1 << 7)) !== 0,
    weaponCrosshair: (message.readUInt8() & 0x01) !== 0,
  };

  const dlcs = readServerBrowserProtocolDlcs(message, dlcMask, ARMA3_DLCS);
  const { mods, creatorDlcs } = readServerBrowserProtocolMods(message, ARMA3_CREATOR_DLCS);
  const signatures = readServerBrowserProtocolSignatures(message);

  if (message.remaining !== 0) {
    throw new TrailingServerBrowserProtocolDataError({ remaining: message.remaining });
  }

  return ServerBrowserProtocol3MessageSchema.parse({
    version,
    generalFlags,
    dlcs,
    difficulty,
    mods,
    creatorDlcs,
    signatures,
    extraRules,
  });
};
