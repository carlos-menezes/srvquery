import { BufferCursor } from "@srvquery/core";
import { type ValveBinaryRule, type ValveRules } from "@srvquery/protocol-valve";
import { DayZRulesSchema, type DayZDlc, type DayZRules } from "./schema";

const DAYZ_DLCS: Record<number, { appId: number; name: string }> = {
  0x01: { appId: 1151700, name: "Livonia" },
  0x02: { appId: 2968040, name: "Frost Line" },
  0x04: { appId: 3816030, name: "Badlands" },
  0x08: { appId: 830660, name: "Survivor GameZ" },
};

const unescapePages = (pages: ValveBinaryRule[]): Buffer => {
  const ordered = [...pages].sort((left, right) => left.key[0] - right.key[0]);
  const total = ordered[0]?.key[1];
  const pageNumbers = new Set(ordered.map((page) => page.key[0]));
  if (
    total === undefined ||
    ordered.length !== total ||
    ordered.some((page) => page.key.length !== 2 || page.key[1] !== total) ||
    Array.from({ length: total }, (_, index) => index + 1).some((page) => !pageNumbers.has(page))
  ) {
    throw new Error("Incomplete DayZ rules pages");
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
    else throw new Error("Invalid DayZ rules escape sequence");
  }
  return Buffer.from(bytes);
};

const parseUInt16Rule = (rules: Record<string, string>, key: string): number | undefined => {
  const value = rules[key];
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffff) {
    throw new Error(`Invalid DayZ rule ${key}: ${value}`);
  }
  return parsed;
};

export const dayzRuleParser = (Valve: ValveRules): DayZRules => {
  const pages = Valve.binaryRules.filter(
    (rule) => rule.key.length === 2 && rule.key[0] <= rule.key[1],
  );
  const extraBinaryRules = Valve.binaryRules.filter((rule) => !pages.includes(rule));
  const cursor = new BufferCursor(unescapePages(pages));

  const protocol = cursor.readUInt8();
  if (protocol !== 2) {
    throw new Error(`Unsupported DayZ rules protocol version: ${protocol}`);
  }

  const flags = cursor.readUInt8();
  const dlcMask = cursor.readUInt16LE();
  const dlcs: DayZDlc[] = [];
  for (let mask = 1; mask <= 0x8000; mask <<= 1) {
    if ((dlcMask & mask) === 0) continue;
    const known = DAYZ_DLCS[mask];
    dlcs.push({
      mask,
      appId: known?.appId,
      name: known?.name ?? `Unknown DLC ${mask}`,
      hash: cursor.readUInt32LE(),
    });
  }

  const mods = Array.from({ length: cursor.readUInt8() }, () => {
    const hash = cursor.readUInt32LE();
    const idLength = cursor.readUInt8();
    if (idLength !== 1 && idLength !== 4 && idLength !== 8) {
      throw new Error(`Unsupported DayZ mod ID length: ${idLength}`);
    }
    const id =
      idLength === 1
        ? BigInt(cursor.readUInt8())
        : idLength === 4
          ? BigInt(cursor.readUInt32LE())
          : cursor.readBigUInt64LE();
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      cursor.readBytes(cursor.readUInt8()),
    );
    return { id, name, hash };
  });

  const signatures = Array.from({ length: cursor.readUInt8() }, () =>
    new TextDecoder("utf-8", { fatal: true }).decode(cursor.readBytes(cursor.readUInt8())),
  ).filter((signature) => signature.length > 0);
  const description =
    cursor.remaining > 0
      ? new TextDecoder("utf-8", { fatal: true }).decode(cursor.readBytes(cursor.readUInt8()))
      : "";
  if (cursor.remaining !== 0) throw new Error("Unexpected trailing DayZ rules data");

  const knownRules = new Set([
    "allowedBuild",
    "clientPort",
    "dedicated",
    "island",
    "language",
    "platform",
    "requiredBuild",
    "requiredVersion",
    "timeLeft",
  ]);
  const extraRules = Object.fromEntries(
    Object.entries(Valve.rules).filter(([key]) => !knownRules.has(key)),
  );

  return DayZRulesSchema.parse({
    protocol,
    flags,
    dlcs,
    mods,
    signatures,
    description,
    allowedBuild: parseUInt16Rule(Valve.rules, "allowedBuild"),
    clientPort: parseUInt16Rule(Valve.rules, "clientPort"),
    dedicated: Valve.rules.dedicated === undefined ? undefined : Valve.rules.dedicated === "1",
    island: Valve.rules.island,
    language: Valve.rules.language === undefined ? undefined : Number(Valve.rules.language),
    platform: Valve.rules.platform,
    requiredBuild: parseUInt16Rule(Valve.rules, "requiredBuild"),
    requiredVersion: parseUInt16Rule(Valve.rules, "requiredVersion"),
    timeLeft: parseUInt16Rule(Valve.rules, "timeLeft"),
    extraRules,
    extraBinaryRules,
  });
};
