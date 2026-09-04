import { BufferCursor } from "@srvquery/core";
import z from "zod";
import {
  IncompleteServerBrowserProtocolMessageError,
  InvalidServerBrowserProtocolEscapeSequenceError,
  UnsupportedServerBrowserProtocolModIdLengthError,
} from "./errors";

export const byte = z.number().int().min(0).max(0xff);
export const uint16 = z.number().int().min(0).max(0xffff);
export const uint32 = z.number().int().min(0).max(0xffffffff);

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

/** DLC required by a server, including its bit mask and content hash. */
export type ServerBrowserProtocolDlc = z.infer<typeof ServerBrowserProtocolDlcSchema>;
/** Mod required by a server, including its Workshop ID and content hash. */
export type ServerBrowserProtocolMod = z.infer<typeof ServerBrowserProtocolModSchema>;
/** Creator DLC entry encoded in a mods section (Arma 3 only). */
export type ServerBrowserProtocolCreatorDlc = z.infer<typeof ServerBrowserProtocolCreatorDlcSchema>;

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
    throw new IncompleteServerBrowserProtocolMessageError();
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
    else throw new InvalidServerBrowserProtocolEscapeSequenceError({ marker: value });
  }
  return Buffer.from(bytes);
};

/**
 * Reads a raw `A2S_RULES` response, reassembling its server browser protocol pages into a single
 * unescaped message buffer. Rule pairs that aren't pages are returned separately as extra rules.
 * @param cursor Cursor positioned at the first byte after the response opcode.
 */
export const reassembleServerBrowserProtocolMessage = (
  cursor: BufferCursor,
): { message: BufferCursor; extraRules: Record<string, string> } => {
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

  return { message: new BufferCursor(unescapePages(pages)), extraRules };
};

/** Reads a 4-byte content hash for every set bit in `dlcMask`, naming known DLCs from `names`. */
export const readServerBrowserProtocolDlcs = (
  message: BufferCursor,
  dlcMask: number,
  names: Record<number, { appId: number; name: string }>,
): ServerBrowserProtocolDlc[] => {
  const dlcs: ServerBrowserProtocolDlc[] = [];
  for (let mask = 1; mask <= 0x8000; mask <<= 1) {
    if ((dlcMask & mask) === 0) continue;
    const known = names[mask];
    dlcs.push({
      mask,
      appId: known?.appId,
      name: known?.name ?? `Unknown DLC ${mask}`,
      hash: message.readUInt32LE(),
    });
  }
  return dlcs;
};

/** Reads the mods section, splitting out Creator DLC entries (ID length 19) by `creatorDlcNames`. */
export const readServerBrowserProtocolMods = (
  message: BufferCursor,
  creatorDlcNames: Record<number, string> = {},
): { mods: ServerBrowserProtocolMod[]; creatorDlcs: ServerBrowserProtocolCreatorDlc[] } => {
  const mods: ServerBrowserProtocolMod[] = [];
  const creatorDlcs: ServerBrowserProtocolCreatorDlc[] = [];
  const modCount = message.readUInt8();
  for (let i = 0; i < modCount; i += 1) {
    const hash = message.readUInt32LE();
    const idLength = message.readUInt8();

    // idLength 19 marks a Creator DLC entry (Arma 3 only): a 4-byte app ID with no name field.
    if (idLength === 19) {
      const appId = message.readUInt32LE();
      creatorDlcs.push({ appId, name: creatorDlcNames[appId] });
      continue;
    }

    if (idLength !== 1 && idLength !== 4 && idLength !== 8) {
      throw new UnsupportedServerBrowserProtocolModIdLengthError({ idLength });
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
  return { mods, creatorDlcs };
};

/** Reads the signature list, skipping zero-length entries. */
export const readServerBrowserProtocolSignatures = (message: BufferCursor): string[] => {
  const signatures: string[] = [];
  const signatureCount = message.readUInt8();
  for (let i = 0; i < signatureCount; i += 1) {
    const length = message.readUInt8();
    if (length === 0) continue;
    signatures.push(new TextDecoder("utf-8", { fatal: true }).decode(message.readBytes(length)));
  }
  return signatures;
};
