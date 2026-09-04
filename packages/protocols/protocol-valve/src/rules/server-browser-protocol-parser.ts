import { BufferCursor } from "@srvquery/core";
import z from "zod";

const byte = z.number().int().min(0).max(0xff);
const uint16 = z.number().int().min(0).max(0xffff);
const uint32 = z.number().int().min(0).max(0xffffffff);

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

/** Known DayZ DLC Steam app IDs, keyed by their bit in the DLC mask. */
const DAYZ_DLCS: Record<number, { appId: number; name: string }> = {
  0x1: { appId: 1151700, name: "Livonia" },
  0x2: { appId: 2968040, name: "Frost Line" },
  0x4: { appId: 3816030, name: "Badlands" },
  0x8: { appId: 830660, name: "Survivor GameZ" },
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

/** Validates a DLC entry, including its bit mask and content hash. */
export const ServerBrowserProtocolDlcSchema = z.object({
  mask: uint16,
  appId: uint32.optional(),
  name: z.string(),
  hash: uint32,
});

/** Validates a mod required by the server, including its Workshop ID and content hash. */
export const ServerBrowserProtocolModSchema = z.object({
  hash: uint32,
  id: z.bigint().nonnegative(),
  name: z.string(),
});

/** Validates a Creator DLC entry encoded in the mods section (Arma 3 only). */
export const ServerBrowserProtocolCreatorDlcSchema = z.object({
  appId: uint32,
  name: z.string().optional(),
});

/** Validates the Arma 3 difficulty settings carried by a version 3 message. */
export const ServerBrowserProtocolDifficultySchema = z.object({
  level: byte,
  aiLevel: byte,
  advancedFlightModel: z.boolean(),
  thirdPersonCamera: z.boolean(),
  weaponCrosshair: z.boolean(),
});

/** Validates the decoded "Server Message" body of a server browser protocol response. */
export const ServerBrowserProtocolMessageSchema = z.object({
  // Version 2 is DayZ (no difficulty bytes, trailing description); version 3 is Arma 3.
  version: z.union([z.literal(2), z.literal(3)]),
  // Purpose of these 8 bits is undocumented upstream.
  generalFlags: byte,
  dlcs: z.array(ServerBrowserProtocolDlcSchema),
  difficulty: ServerBrowserProtocolDifficultySchema.optional(),
  mods: z.array(ServerBrowserProtocolModSchema),
  creatorDlcs: z.array(ServerBrowserProtocolCreatorDlcSchema),
  signatures: z.array(z.string()),
  description: z.string().optional(),
  extraRules: z.record(z.string(), z.string()),
});

/** DLC required by a server, including its bit mask and content hash. */
export type ServerBrowserProtocolDlc = z.infer<typeof ServerBrowserProtocolDlcSchema>;
/** Mod required by a server, including its Workshop ID and content hash. */
export type ServerBrowserProtocolMod = z.infer<typeof ServerBrowserProtocolModSchema>;
/** Decoded "Server Message" body of a server browser protocol response. */
export type ServerBrowserProtocolMessage = z.infer<typeof ServerBrowserProtocolMessageSchema>;

/** One reassembly page carried in an `A2S_RULES` key=value pair: key is `[pageNumber, pageCount]`. */
type ServerBrowserProtocolPage = {
  pageNumber: number;
  pageCount: number;
  value: Buffer;
};

/** Reads a null-terminated field as raw bytes, without decoding it as UTF-8. */
const readRawCString = (cursor: BufferCursor): Buffer => {
  const terminator = cursor.buffer.indexOf(0, cursor.offset);
  const end = terminator === -1 ? cursor.buffer.length : terminator;
  const value = cursor.buffer.subarray(cursor.offset, end);
  cursor.skip(end - cursor.offset + (terminator === -1 ? 0 : 1));
  return value;
};

/** Reassembles ordered pages into a single buffer and reverses the byte-escaping scheme. */
const unescapePages = (pages: ServerBrowserProtocolPage[]): Buffer => {
  const ordered = [...pages].sort((left, right) => left.pageNumber - right.pageNumber);
  const total = ordered[0]?.pageCount;
  if (
    total === undefined ||
    ordered.length !== total ||
    ordered.some((page, position) => page.pageCount !== total || page.pageNumber !== position + 1)
  ) {
    throw new Error("Incomplete server browser protocol message");
  }

  const escaped = Buffer.concat(ordered.map((page) => page.value));
  const bytes: number[] = [];
  for (let index = 0; index < escaped.length; index += 1) {
    if (escaped[index] !== 0x01) {
      bytes.push(escaped[index]);
      continue;
    }
    const value = escaped[++index];
    if (value === 0x01) bytes.push(0x01);
    else if (value === 0x02) bytes.push(0x00);
    else if (value === 0x03) bytes.push(0xff);
    else throw new Error("Invalid server browser protocol escape sequence");
  }
  return Buffer.from(bytes);
};

/**
 * Decodes the "Server Message" body carried by a server browser protocol `A2S_RULES` response.
 * @param message Cursor over the reassembled, unescaped message buffer.
 */
const parseMessage = (message: BufferCursor): Omit<ServerBrowserProtocolMessage, "extraRules"> => {
  const version = message.readUInt8();
  if (version !== 2 && version !== 3) {
    throw new Error(`Unsupported server browser protocol version: ${version}`);
  }

  const generalFlags = message.readUInt8();
  const dlcMask = message.readUInt16LE();

  // Only Arma 3 (version 3) messages carry difficulty settings.
  const difficulty =
    version === 3
      ? (() => {
          const difficultyByte = message.readUInt8();
          return {
            level: difficultyByte & 0b0000_0111,
            aiLevel: (difficultyByte >> 3) & 0b0000_0111,
            advancedFlightModel: (difficultyByte & (1 << 6)) === 0,
            thirdPersonCamera: (difficultyByte & (1 << 7)) !== 0,
            weaponCrosshair: (message.readUInt8() & 0x01) !== 0,
          };
        })()
      : undefined;

  const dlcNames = version === 3 ? ARMA3_DLCS : DAYZ_DLCS;
  const dlcs: ServerBrowserProtocolDlc[] = [];
  for (let mask = 1; mask <= 0x8000; mask <<= 1) {
    if ((dlcMask & mask) === 0) continue;
    const known = dlcNames[mask];
    dlcs.push({
      mask,
      appId: known?.appId,
      name: known?.name ?? `Unknown DLC ${mask}`,
      hash: message.readUInt32LE(),
    });
  }

  const mods: ServerBrowserProtocolMod[] = [];
  const creatorDlcs: z.infer<typeof ServerBrowserProtocolCreatorDlcSchema>[] = [];
  const modCount = message.readUInt8();
  for (let i = 0; i < modCount; i += 1) {
    const hash = message.readUInt32LE();
    const idLength = message.readUInt8();

    // idLength 19 marks a Creator DLC entry (Arma 3 only): a 4-byte app ID with no name field.
    if (idLength === 19) {
      const appId = message.readUInt32LE();
      creatorDlcs.push({ appId, name: ARMA3_CREATOR_DLCS[appId] });
      continue;
    }

    if (idLength !== 1 && idLength !== 4 && idLength !== 8) {
      throw new Error(`Unsupported mod ID length: ${idLength}`);
    }
    const id =
      idLength === 1
        ? BigInt(message.readUInt8())
        : idLength === 4
          ? BigInt(message.readUInt32LE())
          : message.readBigUInt64LE();
    const nameLength = message.readUInt8();
    const name =
      nameLength > 0
        ? new TextDecoder("utf-8", { fatal: true }).decode(message.readBytes(nameLength))
        : "";
    mods.push({ hash, id, name });
  }

  const signatures: string[] = [];
  const signatureCount = message.readUInt8();
  for (let i = 0; i < signatureCount; i += 1) {
    const length = message.readUInt8();
    if (length === 0) continue;
    signatures.push(new TextDecoder("utf-8", { fatal: true }).decode(message.readBytes(length)));
  }

  // DayZ appends a trailing server description; Arma 3 ends the message at the signatures.
  const description =
    message.remaining > 0
      ? new TextDecoder("utf-8", { fatal: true }).decode(message.readBytes(message.readUInt8()))
      : undefined;

  if (message.remaining !== 0) throw new Error("Unexpected trailing server browser protocol data");

  return { version, generalFlags, dlcs, difficulty, mods, creatorDlcs, signatures, description };
};

/**
 * Parses a server browser protocol `A2S_RULES` response (DayZ v2 or Arma 3 v3): reassembles the
 * paged, escaped message from the rule pairs, then decodes its "Server Message" body.
 * @param cursor Cursor positioned at the first byte after the response opcode.
 */
export const serverBrowserProtocolRulesParser = (
  cursor: BufferCursor,
): ServerBrowserProtocolMessage => {
  const ruleCount = cursor.readUInt16LE();
  const pages: ServerBrowserProtocolPage[] = [];
  const extraRules: Record<string, string> = {};

  for (let i = 0; i < ruleCount; i += 1) {
    const key = readRawCString(cursor);
    const value = readRawCString(cursor);
    // Page markers are a 2-byte key: [pageNumber, pageCount], with pageNumber <= pageCount.
    if (key.length === 2 && key[0] <= key[1]) {
      pages.push({ pageNumber: key[0], pageCount: key[1], value });
    } else {
      extraRules[key.toString("utf8")] = value.toString("utf8");
    }
  }

  const message = parseMessage(new BufferCursor(unescapePages(pages)));
  return ServerBrowserProtocolMessageSchema.parse({ ...message, extraRules });
};
