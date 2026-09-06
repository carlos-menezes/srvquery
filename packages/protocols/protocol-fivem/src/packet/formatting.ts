/**
 * FiveM/RedM `^`-prefixed color and formatting codes (e.g. `^1` for red, `^*` for orange).
 * @link https://docs.fivem.net/docs/scripting-manual/introduction/color-codes/
 */
const FORMATTING_CODE_PATTERN = /\^(?:[0-9]|\*|[dpqr])/g;

/** Strips FiveM/RedM `^`-prefixed color and formatting codes from a string. */
export const stripFiveMFormattingCodes = (value: string): string =>
  value.replace(FORMATTING_CODE_PATTERN, "");

/** Recursively strips FiveM/RedM formatting codes from every string found in `value`. */
export const deepStripFiveMFormattingCodes = <T>(value: T): T => {
  if (typeof value === "string") return stripFiveMFormattingCodes(value) as T;
  if (Array.isArray(value)) return value.map(deepStripFiveMFormattingCodes) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, deepStripFiveMFormattingCodes(val)]),
    ) as T;
  }
  return value;
};
